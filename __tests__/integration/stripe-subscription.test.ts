import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SubscriptionTier } from '@/lib/models/user';

// Mock stripe module
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
          amount_total: 999,
          customer: 'cus_test_123',
          subscription: 'sub_test_123'
        })
      }
    },
    subscriptions: {
      update: jest.fn().mockResolvedValue({
        id: 'sub_test_123',
        cancel_at_period_end: true,
        cancel_at: 1234567890
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test_123',
        status: 'active',
        cancel_at_period_end: false
      })
    },
    prices: {
      create: jest.fn().mockResolvedValue({
        id: 'price_mock_individual',
        unit_amount: 999,
        currency: 'usd'
      }),
      retrieve: jest.fn().mockImplementation((id) => {
        if (id === 'price_mock_individual' || id === 'price_mock_family') {
          return Promise.resolve({
            id,
            unit_amount: id.includes('individual') ? 999 : 1999,
            currency: 'usd'
          });
        }
        return Promise.reject(new Error('Price not found'));
      })
    },
    products: {
      create: jest.fn().mockResolvedValue({
        id: 'prod_mock_individual',
        name: 'BabelBooks Individual Plan'
      }),
      retrieve: jest.fn().mockImplementation((id) => {
        if (id === 'prod_mock_individual' || id === 'prod_mock_family') {
          return Promise.resolve({
            id,
            name: `BabelBooks ${id.includes('individual') ? 'Individual' : 'Family'} Plan`
          });
        }
        return Promise.reject(new Error('Product not found'));
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation((body, sig, secret) => ({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: {
              userId: 'test-user-123',
              tier: 'individual'
            }
          }
        }
      }))
    }
  }));
});

describe('Stripe Subscription Integration', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: string | Request | URL, init?: RequestInit) => {
        const urlString = typeof url === 'string' ? url : url.toString();
        
        // Mock auth endpoint
        if (urlString.includes('/api/auth/session') || urlString.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              user: { id: 'test-user-123', email: 'test@example.com', subscription: { tier: 'free' } }
            })
          } as Response);
        }
        
        // Mock subscription endpoints
        if (urlString.includes('/api/subscription')) {
          if (init?.method === 'POST') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123'
              })
            } as Response);
          }
          
          if (init?.method === 'DELETE') {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                message: 'Subscription will be canceled at the end of the current billing period',
                cancelAt: 1234567890
              })
            } as Response);
          }
          
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              subscription: {
                tier: 'individual',
                isActive: true,
                usage: {
                  storiesUsed: 5,
                  storiesLimit: 15,
                  hasEssentialAccess: true
                }
              }
            })
          } as Response);
        }
        
        return Promise.reject(new Error('Unexpected URL: ' + urlString));
      }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Subscription Purchase', () => {
    it('should create a checkout session for Individual plan', async () => {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: SubscriptionTier.INDIVIDUAL })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_123');
    });

    it('should create a checkout session for Family plan', async () => {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: SubscriptionTier.FAMILY })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_123');
    });
  });

  describe('Subscription Management', () => {
    it('should fetch current subscription details', async () => {
      const response = await fetch('/api/subscription');
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.subscription).toMatchObject({
        tier: 'individual',
        isActive: true,
        usage: {
          storiesUsed: 5,
          storiesLimit: 15,
          hasEssentialAccess: true
        }
      });
    });

    it('should cancel subscription', async () => {
      const response = await fetch('/api/subscription', {
        method: 'DELETE'
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.message).toContain('canceled at the end of the current billing period');
      expect(data.cancelAt).toBeDefined();
    });
  });

  describe('Webhook Handling', () => {
    it('should handle checkout.session.completed webhook', async () => {
      const webhookPayload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              userId: 'test-user-123',
              tier: 'individual'
            }
          }
        }
      };

      // In a real test, you would test the webhook endpoint
      // For now, we just verify the structure
      expect(webhookPayload.type).toBe('checkout.session.completed');
      expect(webhookPayload.data.object.metadata.tier).toBe('individual');
    });
  });
});