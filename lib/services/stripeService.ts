import Stripe from 'stripe';
import { SubscriptionTier } from '../models/user';

// Initialize Stripe with local mock configuration
const stripeConfig: Stripe.StripeConfig = {
  apiVersion: '2025-02-24.acacia',
};

// For local development with stripe-mock
if (process.env.STRIPE_API_BASE) {
  try {
    const url = new URL(process.env.STRIPE_API_BASE);
    stripeConfig.host = url.hostname;
    stripeConfig.protocol = url.protocol.replace(':', '') as any;
    stripeConfig.port = parseInt(url.port || '80');
  } catch (error) {
    console.warn('Invalid STRIPE_API_BASE URL:', process.env.STRIPE_API_BASE);
    // Don't modify stripeConfig if URL is invalid
  }
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', stripeConfig);

// Mock price IDs for stripe-mock
export const STRIPE_PRICES: Partial<Record<SubscriptionTier, string>> = {
  [SubscriptionTier.INDIVIDUAL]: process.env.STRIPE_PRICE_INDIVIDUAL || 'price_mock_individual',
  [SubscriptionTier.FAMILY]: process.env.STRIPE_PRICE_FAMILY || 'price_mock_family',
};

// Mock product IDs
export const STRIPE_PRODUCTS: Partial<Record<SubscriptionTier, string>> = {
  [SubscriptionTier.INDIVIDUAL]: 'prod_mock_individual',
  [SubscriptionTier.FAMILY]: 'prod_mock_family',
};

export class StripeService {
  static async createCheckoutSession(
    userId: string,
    userEmail: string,
    tier: SubscriptionTier,
    currentSubscriptionId?: string
  ) {
    try {
      // For local development with stripe-mock, use mock checkout
      if (process.env.NODE_ENV === 'development' && process.env.STRIPE_API_BASE) {
        const mockSessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store session data for later retrieval
        const mockSession = {
          id: mockSessionId,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/checkout/mock?session_id=${mockSessionId}&tier=${tier}`,
          metadata: {
            userId,
            tier,
            previousSubscriptionId: currentSubscriptionId || '',
          },
          customer_email: userEmail,
        };
        
        return mockSession as any;
      }
      
      // Production Stripe checkout
      const price = await this.getOrCreatePrice(tier);
      
      const sessionData: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
        customer_email: userEmail,
        metadata: {
          userId,
          tier,
          previousSubscriptionId: currentSubscriptionId || '',
        },
        // Allow promotion codes
        allow_promotion_codes: true,
      };

      // If upgrading/downgrading, handle proration
      if (currentSubscriptionId) {
        sessionData.subscription_data = {
          metadata: {
            previousSubscriptionId: currentSubscriptionId,
          },
        };
      }

      return await stripe.checkout.sessions.create(sessionData);
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  static async cancelSubscription(subscriptionId: string) {
    try {
      // Cancel at period end to allow access until the end of billing period
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  static async reactivateSubscription(subscriptionId: string) {
    try {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  static async getSubscription(subscriptionId: string) {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw error;
    }
  }

  static async createCustomerPortalSession(customerId: string) {
    try {
      return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
      });
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw error;
    }
  }

  static async handleWebhookEvent(
    body: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    try {
      return stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test'
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw error;
    }
  }

  // Helper method to create prices for stripe-mock
  private static async getOrCreatePrice(tier: SubscriptionTier) {
    const priceId = STRIPE_PRICES[tier];
    
    if (!priceId) {
      throw new Error(`No price configured for tier: ${tier}`);
    }
    
    try {
      // Try to retrieve existing price
      return await stripe.prices.retrieve(priceId);
    } catch (error) {
      // Create new price for stripe-mock
      const amount = tier === SubscriptionTier.INDIVIDUAL ? 999 : 1999; // $9.99 or $19.99
      
      // First create product
      let product;
      const productId = STRIPE_PRODUCTS[tier];
      if (!productId) {
        throw new Error(`No product configured for tier: ${tier}`);
      }
      
      try {
        product = await stripe.products.retrieve(productId);
      } catch {
        product = await stripe.products.create({
          id: productId,
          name: `BabelBooks ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
          description: tier === SubscriptionTier.INDIVIDUAL 
            ? '15 stories per month, unlimited replays' 
            : '30 stories per month, up to 4 family members',
        });
      }

      // Create price (without custom ID as Stripe doesn't support it)
      return await stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
      });
    }
  }

  static getTierFromPriceId(priceId: string): SubscriptionTier | null {
    for (const [tier, price] of Object.entries(STRIPE_PRICES)) {
      if (price === priceId) {
        return tier as SubscriptionTier;
      }
    }
    return null;
  }
}