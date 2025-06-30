'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if this is a mock checkout
    const isMock = searchParams.get('mock') === 'true';
    const sessionId = searchParams.get('session_id');
    
    if (isMock && sessionId?.startsWith('cs_mock_')) {
      // For mock checkout, extract tier from session ID and update subscription
      const handleMockSuccess = async () => {
        try {
          // Parse tier from URL or session data
          const urlParams = new URLSearchParams(window.location.search);
          const mockTier = urlParams.get('tier') || 'individual';
          
          // In a real implementation, you'd update the user's subscription in the database
          // For now, we'll just fetch the updated subscription
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
        } catch (error) {
          console.error('Mock checkout processing error:', error);
        }
      };
      
      handleMockSuccess();
    }

    // Fetch updated subscription details
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user, router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl p-12 max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-6">🎉</div>
        
        <h1 className="font-display text-4xl font-bold text-dream-blue mb-4">
          Welcome to BabelBooks {subscription?.tier}!
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          Your subscription is now active. Get ready to create amazing stories!
        </p>

        <div className="bg-purple-50 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">Your {subscription?.tier} plan includes:</h2>
          <ul className="space-y-2 text-left max-w-md mx-auto">
            {subscription?.tier === 'individual' && (
              <>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  15 stories per month
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited story replays
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Access to Essential Collection
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Priority support
                </li>
              </>
            )}
            {subscription?.tier === 'family' && (
              <>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  30 stories per month
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Up to 4 family members
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Access to Essential Collection
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited story replays
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Priority support
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="space-y-4">
          <Link
            href="/create"
            className="block bg-storybook-violet text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-opacity-90 transition-all transform hover:scale-105"
          >
            Create Your First Story ✨
          </Link>
          
          <Link
            href="/marketplace"
            className="block text-storybook-violet hover:underline"
          >
            Or browse the story marketplace →
          </Link>
        </div>

        {subscription?.tier === 'family' && (
          <div className="mt-8 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-gray-700">
              <strong>Family Account:</strong> You can now invite up to 3 family members.{' '}
              <Link href="/profile" className="text-purple-600 hover:underline">
                Manage family members →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}