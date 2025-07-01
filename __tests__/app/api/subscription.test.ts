import { GET, POST } from '@/app/api/subscription/route';
import { POST as webhookHandler } from '@/app/api/webhooks/stripe/route';
import { NextRequest } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/userService';
import { SubscriptionTier } from '@/lib/models/user';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/services/userService');
jest.mock('stripe');

describe('Subscription API', () => {
  const mockSession = {
    userId: 'user123',
    email: 'test@example.com',
    subscriptionTier: SubscriptionTier.FREE,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PRICE_INDIVIDUAL = 'price_individual_123';
    process.env.STRIPE_PRICE_FAMILY = 'price_family_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    process.env.NEXT_PUBLIC_URL = 'http://localhost:3000';
    
    // Clear Stripe mocks
    if (Stripe.mockCheckout) {
      Stripe.mockCheckout.sessions.create.mockClear();
    }
    if (Stripe.mockWebhooks) {
      Stripe.mockWebhooks.constructEvent.mockClear();
    }
    
    // Mock requireAuth to pass through the session
    (requireAuth as jest.Mock).mockImplementation((session) => {
      if (!session) throw new Error('Unauthorized');
      return session;
    });
  });

  describe('GET /api/subscription', () => {
    it('should return user subscription details', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        subscription: {
          tier: SubscriptionTier.INDIVIDUAL,
          isActive: true,
        },
        usage: {
          storiesCreatedThisMonth: 5,
        },
        familyAccount: null,
      };
      
      (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (UserService.getFamilyUsage as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/subscription');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subscription).toEqual({
        tier: SubscriptionTier.INDIVIDUAL,
        isActive: true,
        limits: {
          storiesPerMonth: 15,
          replaysPerStory: 'unlimited',
          maxFamilyMembers: 1,
          hasEssentialAccess: true,
        },
        usage: {
          storiesUsed: 5,
          storiesLimit: 15,
          replaysLimit: 'unlimited',
          hasEssentialAccess: true,
        },
        familyMembers: 0,
        maxFamilyMembers: 1,
      });

      expect(UserService.getUserById).toHaveBeenCalledWith('user123');
    });

    it('should return 401 when not authenticated', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/subscription');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/subscription', () => {
    it('should create checkout session for individual tier', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        subscription: {
          tier: SubscriptionTier.FREE,
          isActive: true,
        },
      };
      
      (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/subscription', {
        method: 'POST',
        body: JSON.stringify({ tier: SubscriptionTier.INDIVIDUAL }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checkoutUrl).toBe('https://checkout.stripe.com/test');

      expect(Stripe.mockCheckout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [{
          price: 'price_individual_123',
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: expect.stringContaining('/subscription/success'),
        cancel_url: expect.stringContaining('/subscription/cancel'),
        customer_email: 'test@example.com',
        metadata: {
          userId: 'user123',
          tier: SubscriptionTier.INDIVIDUAL,
        },
      });
    });

    it('should create checkout session for family tier', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockSession);
      
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        subscription: {
          tier: SubscriptionTier.FREE,
          isActive: true,
        },
      };
      
      (UserService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/subscription', {
        method: 'POST',
        body: JSON.stringify({ tier: SubscriptionTier.FAMILY }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checkoutUrl).toBe('https://checkout.stripe.com/test');

      expect(Stripe.mockCheckout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{
            price: 'price_family_123',
            quantity: 1,
          }],
          metadata: {
            userId: 'user123',
            tier: SubscriptionTier.FAMILY,
          },
        })
      );
    });

    it('should reject invalid tier', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/subscription', {
        method: 'POST',
        body: JSON.stringify({ tier: 'invalid' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid subscription tier');
    });

    it('should reject free tier', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/subscription', {
        method: 'POST',
        body: JSON.stringify({ tier: SubscriptionTier.FREE }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot downgrade to free tier');
    });
  });
});

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle checkout.session.completed event', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_test_123',
          subscription: 'sub_test_123',
          metadata: {
            userId: 'user123',
            tier: SubscriptionTier.INDIVIDUAL,
          },
        },
      },
    };

    (Stripe.mockWebhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
      body: 'raw_body',
    });

    const response = await webhookHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    expect(UserService.updateSubscription).toHaveBeenCalledWith(
      'user123',
      SubscriptionTier.INDIVIDUAL,
      {
        customerId: 'cus_test_123',
        subscriptionId: 'sub_test_123',
      }
    );
  });

  it('should handle customer.subscription.updated event', async () => {
    const mockEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          items: {
            data: [{
              price: { id: 'price_family_123' },
            }],
          },
          metadata: {
            userId: 'user123',
          },
        },
      },
    };

    process.env.STRIPE_PRICE_FAMILY = 'price_family_123';
    (Stripe.mockWebhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
      body: 'raw_body',
    });

    const response = await webhookHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    expect(UserService.updateSubscription).toHaveBeenCalledWith(
      'user123',
      SubscriptionTier.FAMILY,
      {
        customerId: 'cus_test_123',
        subscriptionId: 'sub_test_123',
      }
    );
  });

  it('should handle customer.subscription.deleted event', async () => {
    const mockEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          metadata: {
            userId: 'user123',
          },
        },
      },
    };

    (Stripe.mockWebhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
      body: 'raw_body',
    });

    const response = await webhookHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    expect(UserService.updateSubscription).toHaveBeenCalledWith(
      'user123',
      SubscriptionTier.FREE
    );
  });

  it('should handle invoice.payment_failed event', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    
    const mockEvent = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          subscription_details: {
            metadata: {
              userId: 'user123',
            },
          },
        },
      },
    };

    (Stripe.mockWebhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
      body: 'raw_body',
    });

    const response = await webhookHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(consoleError).toHaveBeenCalledWith('Payment failed for user:', 'user123');

    consoleError.mockRestore();
  });

  it('should reject invalid webhook signature', async () => {
    (Stripe.mockWebhooks.constructEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': 'invalid_signature',
      },
      body: 'raw_body',
    });

    const response = await webhookHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid signature');
  });
});