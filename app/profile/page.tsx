'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';

interface ChildProfile {
  name: string;
  age: string;
  interests: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [defaultNarrationLanguage, setDefaultNarrationLanguage] = useState('English');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchUserData();
    }
  }, [user, loading, router]);

  const fetchUserData = async () => {
    try {
      // Fetch subscription data
      const subResponse = await fetch('/api/subscription');
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }

      // Fetch user preferences
      const userResponse = await fetch('/api/user/preferences');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setName(userData.name || user?.name || '');
        setDefaultLanguage(userData.defaultLanguage || 'English');
        setDefaultNarrationLanguage(userData.defaultNarrationLanguage || 'English');
        setChildProfiles(userData.childProfiles || []);
      }

      // Fetch family members if applicable
      const familyResponse = await fetch('/api/family/members');
      if (familyResponse.ok) {
        const familyData = await familyResponse.json();
        setFamilyMembers(familyData.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          defaultLanguage,
          defaultNarrationLanguage,
          childProfiles
        })
      });

      if (response.ok) {
        setIsEditing(false);
        alert('Preferences saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences');
    }
  };

  const addChildProfile = () => {
    setChildProfiles([...childProfiles, { name: '', age: '', interests: '' }]);
  };

  const updateChildProfile = (index: number, field: keyof ChildProfile, value: string) => {
    const updated = [...childProfiles];
    updated[index] = { ...updated[index], [field]: value };
    setChildProfiles(updated);
  };

  const removeChildProfile = (index: number) => {
    setChildProfiles(childProfiles.filter((_, i) => i !== index));
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      return;
    }

    setIsCanceling(true);
    try {
      const response = await fetch('/api/subscription', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        await fetchUserData(); // Refresh subscription data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription');
    } finally {
      setIsCanceling(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-display text-2xl font-bold text-dream-blue">
            BabelBooks
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/stories" className="text-gray-700 hover:text-dream-blue">
              My Stories
            </Link>
            <Link href="/marketplace" className="text-gray-700 hover:text-dream-blue">
              Marketplace
            </Link>
            <Link href="/create" className="bg-storybook-violet text-white px-4 py-2 rounded-full text-sm font-semibold">
              Create Story
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        {/* Account Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Account Type</p>
              <p className="font-medium capitalize">{subscription?.tier || 'Free'}</p>
            </div>
          </div>
        </div>

        {/* Subscription Usage */}
        {subscription && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Subscription Usage</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Stories This Month</p>
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-2xl font-bold text-purple-600">
                      {subscription.usage.storiesUsed} / {subscription.usage.storiesLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${(subscription.usage.storiesUsed / subscription.usage.storiesLimit) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Essential Collection</p>
                  <p className="font-medium">
                    {subscription.usage.hasEssentialAccess ? '✅ Access' : '❌ No Access'}
                  </p>
                </div>
                {subscription.tier === 'free' && (
                  <Link
                    href="/subscription"
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Preferences</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-purple-600 hover:text-purple-700"
              >
                Edit
              </button>
            ) : (
              <div className="space-x-2">
                <button
                  onClick={handleSavePreferences}
                  className="bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-600 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Story Language
                </label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Español</option>
                  <option value="French">Français</option>
                  <option value="German">Deutsch</option>
                  <option value="Chinese">中文</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Narration Language
                </label>
                <select
                  value={defaultNarrationLanguage}
                  onChange={(e) => setDefaultNarrationLanguage(e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Español</option>
                  <option value="French">Français</option>
                  <option value="German">Deutsch</option>
                  <option value="Chinese">中文</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Child Profiles */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Child Profiles</h2>
            {isEditing && (
              <button
                onClick={addChildProfile}
                className="text-purple-600 hover:text-purple-700"
              >
                + Add Child
              </button>
            )}
          </div>

          {childProfiles.length === 0 && !isEditing ? (
            <p className="text-gray-500">No child profiles added yet.</p>
          ) : (
            <div className="space-y-4">
              {childProfiles.map((child, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Name"
                      value={child.name}
                      onChange={(e) => updateChildProfile(index, 'name', e.target.value)}
                      disabled={!isEditing}
                      className="px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                    <select
                      value={child.age}
                      onChange={(e) => updateChildProfile(index, 'age', e.target.value)}
                      disabled={!isEditing}
                      className="px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    >
                      <option value="">Select age</option>
                      <option value="0-6 months">0-6 months</option>
                      <option value="6-18 months">6-18 months</option>
                      <option value="18-36 months">18-36 months</option>
                      <option value="3-4 years">3-4 years</option>
                      <option value="4-5 years">4-5 years</option>
                    </select>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Interests"
                        value={child.interests}
                        onChange={(e) => updateChildProfile(index, 'interests', e.target.value)}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      />
                      {isEditing && (
                        <button
                          onClick={() => removeChildProfile(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Account Actions</h2>
          <div className="space-y-4">
            <Link
              href="/subscription"
              className="block w-full text-center bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              Manage Subscription
            </Link>
            
            {subscription?.tier !== 'free' && (
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="block w-full bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            )}
            {(subscription?.tier === 'family' || familyMembers?.length > 0) && (
              <Link
                href="/family"
                className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Manage Family Members
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="block w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}