import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { UserService } from '@/lib/services/userService';
import { SubscriptionTier } from '@/lib/models/user';
import { StripeService } from '@/lib/services/stripeService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = await StripeService.handleWebhookEvent(body, signature);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.metadata?.userId && session.metadata?.tier) {
          await UserService.updateSubscription(
            session.metadata.userId,
            session.metadata.tier as SubscriptionTier,
            {
              customerId: session.customer as string,
              subscriptionId: session.subscription as string,
            }
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Handle subscription updates (e.g., plan changes)
        if (subscription.metadata?.userId) {
          const priceId = subscription.items.data[0]?.price.id;
          let tier: SubscriptionTier = SubscriptionTier.FREE;
          
          // Map price IDs to tiers
          if (priceId === process.env.STRIPE_PRICE_INDIVIDUAL) {
            tier = SubscriptionTier.INDIVIDUAL;
          } else if (priceId === process.env.STRIPE_PRICE_FAMILY) {
            tier = SubscriptionTier.FAMILY;
          }
          
          await UserService.updateSubscription(
            subscription.metadata.userId,
            tier,
            {
              customerId: subscription.customer as string,
              subscriptionId: subscription.id,
            }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Downgrade to free tier when subscription is cancelled
        if (subscription.metadata?.userId) {
          await UserService.updateSubscription(
            subscription.metadata.userId,
            SubscriptionTier.FREE
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Handle failed payments
        if (invoice.subscription_details?.metadata?.userId) {
          // You might want to send an email or update the user's subscription status
          console.error('Payment failed for user:', invoice.subscription_details.metadata.userId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}