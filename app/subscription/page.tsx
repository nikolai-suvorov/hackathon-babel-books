'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '2 stories per month',
      '2 replays per story',
      'Basic story creation',
      'Single user',
    ],
    limitations: [
      'No access to Essential Collection',
      'Limited replays',
    ],
    current: true,
  },
  {
    id: 'individual',
    name: 'Individual',
    price: '$9.99',
    period: 'per month',
    features: [
      '15 stories per month',
      'Unlimited replays',
      'Access to Essential Collection',
      'Priority story generation',
      'Save favorites',
    ],
    cta: 'Upgrade to Individual',
    popular: true,
  },
  {
    id: 'family',
    name: 'Family',
    price: '$19.99',
    period: 'per month',
    features: [
      '30 stories per month (shared)',
      'Up to 4 family members',
      'Unlimited replays for all',
      'Access to Essential Collection',
      'Family story library',
      'Personalized profiles',
    ],
    cta: 'Upgrade to Family',
  },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(tier);

    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-600">
            Create magical stories for your little ones
          </p>
        </div>

        {subscription && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold mb-2">Your Current Usage</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Stories this month</p>
                <p className="text-2xl font-bold text-purple-600">
                  {subscription.usage.storiesUsed} / {subscription.usage.storiesLimit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current plan</p>
                <p className="text-2xl font-bold capitalize">{subscription.tier}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const isCurrent = user && subscription?.tier === plan.id;
            
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-lg p-8 relative ${
                  plan.popular ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation, index) => (
                    <li key={`limit-${index}`} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-500">{limitation}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 border border-gray-300 rounded-md text-gray-500 bg-gray-100 cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : plan.cta ? (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      plan.popular
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-gray-800 hover:bg-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50`}
                  >
                    {loading === plan.id ? 'Processing...' : plan.cta}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p className="mb-2">All plans include:</p>
          <p>✨ AI-powered story generation • 🎨 Beautiful illustrations • 🎵 Audio narration</p>
          <p className="mt-4 text-sm">Cancel anytime. No hidden fees.</p>
        </div>
      </div>
    </div>
  );
}