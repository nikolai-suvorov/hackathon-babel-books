'use client';

import Link from "next/link";
import { useAuth } from '@/lib/contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-b from-soft-white to-blue-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-display text-2xl font-bold text-dream-blue">
            {process.env.NEXT_PUBLIC_PRODUCT_NAME || "BabelBooks"}
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/marketplace" className="text-gray-700 hover:text-dream-blue">
              Marketplace
            </Link>
            <Link href="/subscription" className="text-gray-700 hover:text-dream-blue">
              Pricing
            </Link>
            {user ? (
              <>
                <Link href="/stories" className="text-gray-700 hover:text-dream-blue">
                  My Stories
                </Link>
                <Link
                  href="/create"
                  className="bg-storybook-violet text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-opacity-90"
                >
                  Create Story
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-dream-blue">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-storybook-violet text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-opacity-90"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-display text-6xl font-bold text-dream-blue mb-4">
            {process.env.NEXT_PUBLIC_PRODUCT_NAME || "BabelBooks"}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform simple prompts into magical, illustrated stories for your little ones. 
            Perfect for bilingual families and bedtime adventures!
          </p>
          
          {user ? (
            <Link
              href="/create"
              className="inline-block bg-storybook-violet text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-opacity-90 transition-all transform hover:scale-105"
            >
              Create Your Next Story ✨
            </Link>
          ) : (
            <div className="space-y-4">
              <Link
                href="/register"
                className="inline-block bg-storybook-violet text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-opacity-90 transition-all transform hover:scale-105"
              >
                Start Free with 2 Stories ✨
              </Link>
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-storybook-violet hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <div className="bg-white p-8 rounded-3xl shadow-lg text-center">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="font-display text-xl font-semibold mb-2 text-dream-blue">
              AI-Generated Illustrations
            </h3>
            <p className="text-gray-600">
              Beautiful, unique images for every page of your story
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg text-center">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="font-display text-xl font-semibold mb-2 text-dream-blue">
              Multilingual Support
            </h3>
            <p className="text-gray-600">
              Stories in 8+ languages with bilingual narration options
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg text-center">
            <div className="text-4xl mb-4">🎵</div>
            <h3 className="font-display text-xl font-semibold mb-2 text-dream-blue">
              Interactive & Musical
            </h3>
            <p className="text-gray-600">
              Narration with background music and sound effects
            </p>
          </div>
        </div>

        {/* Age Groups */}
        <div className="bg-white rounded-3xl shadow-lg p-12 max-w-5xl mx-auto mb-16">
          <h2 className="font-display text-3xl font-bold text-center mb-8 text-dream-blue">
            Perfect for Every Age
          </h2>
          
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { age: "0-6m", desc: "High contrast, simple shapes" },
              { age: "6-18m", desc: "Bright colors, familiar objects" },
              { age: "18-36m", desc: "Simple adventures, emotions" },
              { age: "3-4y", desc: "Imaginative tales, humor" },
              { age: "4-5y", desc: "Complex stories, lessons" }
            ].map((group) => (
              <div key={group.age} className="text-center">
                <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-full w-20 h-20 mx-auto mb-3 flex items-center justify-center">
                  <span className="font-semibold text-purple-700">{group.age}</span>
                </div>
                <p className="text-sm text-gray-600">{group.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Tiers Preview */}
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold text-dream-blue mb-4">
            Choose Your Adventure
          </h2>
          <p className="text-gray-600 mb-8">Start free, upgrade anytime</p>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="font-semibold text-lg mb-2">Free</h3>
              <p className="text-2xl font-bold mb-4">$0</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ 2 stories/month</li>
                <li>✓ 2 replays/story</li>
                <li>✓ Basic features</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-blue-500 text-white p-6 rounded-2xl shadow-lg transform scale-105">
              <div className="bg-yellow-400 text-purple-900 text-xs font-bold px-2 py-1 rounded-full inline-block mb-2">
                POPULAR
              </div>
              <h3 className="font-semibold text-lg mb-2">Individual</h3>
              <p className="text-2xl font-bold mb-4">$9.99/mo</p>
              <ul className="text-sm space-y-2">
                <li>✓ 15 stories/month</li>
                <li>✓ Unlimited replays</li>
                <li>✓ Essential Collection</li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="font-semibold text-lg mb-2">Family</h3>
              <p className="text-2xl font-bold mb-4">$19.99/mo</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ 30 stories/month</li>
                <li>✓ Up to 4 members</li>
                <li>✓ All features</li>
              </ul>
            </div>
          </div>
          
          <Link
            href="/subscription"
            className="inline-block mt-8 text-storybook-violet hover:underline"
          >
            View detailed pricing →
          </Link>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-dream-blue mb-4">
            Ready to Create Magic?
          </h2>
          <p className="text-gray-600 mb-8">
            Join thousands of families creating personalized stories every day
          </p>
          {!user && (
            <Link
              href="/register"
              className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105"
            >
              Start Your Free Account
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}