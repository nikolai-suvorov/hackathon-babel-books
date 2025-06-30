import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/userService';
import { SubscriptionTier } from '@/lib/models/user';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const body = await request.json();
    const { sessionId, tier } = body;
    
    if (!sessionId || !tier) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Validate session ID is a mock session
    if (!sessionId.startsWith('cs_mock_')) {
      return NextResponse.json(
        { error: 'Invalid mock session' },
        { status: 400 }
      );
    }
    
    // Update user subscription
    await UserService.updateSubscription(
      auth.userId,
      tier as SubscriptionTier,
      {
        customerId: `cus_mock_${auth.userId}`,
        subscriptionId: `sub_mock_${Date.now()}`
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Mock subscription activated'
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Mock checkout completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete mock checkout' },
      { status: 500 }
    );
  }
}