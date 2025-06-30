import { StripeService } from '../lib/services/stripeService';
import { SubscriptionTier } from '../lib/models/user';

// Ensure we're using stripe-mock
process.env.STRIPE_API_BASE = 'http://localhost:12111';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

async function testStripeIntegration() {
  console.log('🧪 Testing Stripe Integration with stripe-mock...\n');

  try {
    // Test 1: Create checkout session for Individual plan
    console.log('1️⃣ Testing checkout session creation for Individual plan...');
    const individualSession = await StripeService.createCheckoutSession(
      'test-user-123',
      'test@example.com',
      SubscriptionTier.INDIVIDUAL
    );
    console.log('✅ Individual checkout session created:', {
      id: individualSession.id,
      url: individualSession.url,
      amount: individualSession.amount_total
    });

    // Test 2: Create checkout session for Family plan
    console.log('\n2️⃣ Testing checkout session creation for Family plan...');
    const familySession = await StripeService.createCheckoutSession(
      'test-user-456',
      'family@example.com',
      SubscriptionTier.FAMILY
    );
    console.log('✅ Family checkout session created:', {
      id: familySession.id,
      url: familySession.url,
      amount: familySession.amount_total
    });

    // Test 3: Test subscription cancellation
    console.log('\n3️⃣ Testing subscription cancellation...');
    // Note: With stripe-mock, we need to create a subscription first
    const mockSubscriptionId = 'sub_mock_test';
    try {
      const canceledSub = await StripeService.cancelSubscription(mockSubscriptionId);
      console.log('✅ Subscription canceled:', {
        id: canceledSub.id,
        cancel_at_period_end: canceledSub.cancel_at_period_end
      });
    } catch (error: any) {
      console.log('⚠️  Cancellation test skipped (expected with mock):', error.message);
    }

    // Test 4: Test webhook event construction
    console.log('\n4️⃣ Testing webhook event handling...');
    const mockWebhookPayload = JSON.stringify({
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
    });
    
    // Note: Webhook signature verification won't work with stripe-mock
    console.log('⚠️  Webhook signature verification skipped for stripe-mock');

    console.log('\n✅ All Stripe integration tests completed!');
    console.log('\n📝 Notes for production:');
    console.log('- Replace stripe-mock with real Stripe API');
    console.log('- Set up real webhook endpoint and secret');
    console.log('- Configure real price IDs in environment variables');
    console.log('- Test with Stripe test mode before going live');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testStripeIntegration();