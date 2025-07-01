'use client';

import Link from 'next/link';

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl p-12 max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-6">🤔</div>
        
        <h1 className="font-display text-4xl font-bold text-gray-800 mb-4">
          Subscription Not Completed
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          It looks like you didn't complete your subscription. No worries!
        </p>

        <div className="bg-blue-50 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">Did you know?</h2>
          <ul className="space-y-2 text-left max-w-md mx-auto text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>You can still create 2 stories per month with our free plan</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>Premium plans unlock unlimited replays and exclusive content</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 mt-1">•</span>
              <span>You can upgrade anytime - no commitment required</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <Link
            href="/subscription"
            className="block bg-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-purple-700 transition-all"
          >
            View Plans Again
          </Link>
          
          <Link
            href="/create"
            className="block text-gray-600 hover:text-gray-800"
          >
            Continue with free plan →
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Questions? Contact us at support@babelbooks.com</p>
        </div>
      </div>
    </div>
  );
}