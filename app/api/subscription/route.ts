import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/userService';
import { SubscriptionTier, SUBSCRIPTION_LIMITS } from '@/lib/models/user';
import { StripeService } from '@/lib/services/stripeService';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const user = await UserService.getUserById(auth.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get current usage
    const usage = await UserService.getFamilyUsage(auth.userId);
    const limits = SUBSCRIPTION_LIMITS[user.subscription.tier];
    
    return NextResponse.json({
      subscription: {
        tier: user.subscription.tier,
        isActive: user.subscription.isActive,
        limits,
        usage: {
          storiesUsed: user.familyAccount?.ownerId ? usage : user.usage.storiesCreatedThisMonth,
          storiesLimit: limits.storiesPerMonth,
          replaysLimit: limits.replaysPerStory,
          hasEssentialAccess: limits.hasEssentialAccess,
        },
        familyMembers: user.familyAccount ? 
          await UserService.getFamilyUsage(user.familyAccount.ownerId.toString()) : 0,
        maxFamilyMembers: limits.maxFamilyMembers,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const body = await request.json();
    const { tier } = body;
    
    if (!tier || !Object.values(SubscriptionTier).includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }
    
    if (tier === SubscriptionTier.FREE) {
      return NextResponse.json(
        { error: 'Cannot downgrade to free tier' },
        { status: 400 }
      );
    }
    
    const user = await UserService.getUserById(auth.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Create Stripe checkout session
    const checkoutSession = await StripeService.createCheckoutSession(
      auth.userId,
      user.email,
      tier,
      user.subscription.stripeSubscriptionId
    );
    
    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Subscription creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const user = await UserService.getUserById(auth.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (!user.subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }
    
    if (user.subscription.tier === SubscriptionTier.FREE) {
      return NextResponse.json(
        { error: 'Cannot cancel free tier' },
        { status: 400 }
      );
    }
    
    // Cancel the subscription at period end
    const canceledSubscription = await StripeService.cancelSubscription(
      user.subscription.stripeSubscriptionId
    );
    
    return NextResponse.json({
      message: 'Subscription will be canceled at the end of the current billing period',
      cancelAt: canceledSubscription.cancel_at,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}