'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Link from 'next/link';

interface FamilyMember {
  id: string;
  email: string;
  name: string;
  isOwner: boolean;
  joinedAt?: string;
}

interface PendingInvitation {
  email: string;
  inviteCode: string;
  expiresAt: string;
}

export default function FamilyManagementPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchFamilyData();
      fetchSubscription();
    }
  }, [user, authLoading, router]);

  const fetchFamilyData = async () => {
    try {
      const response = await fetch('/api/family/members');
      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data.members || []);
        setIsOwner(data.isOwner);
      }
    } catch (error) {
      console.error('Failed to fetch family data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Invitation sent! Share this code with ${inviteEmail}: ${data.inviteCode}`);
        setInviteEmail('');
        setShowInviteForm(false);
        
        // Add to pending invitations
        setPendingInvitations([...pendingInvitations, {
          email: inviteEmail,
          inviteCode: data.inviteCode,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
      alert('Failed to send invitation');
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/family/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      });

      if (response.ok) {
        alert('Successfully joined family!');
        setInviteCode('');
        setShowJoinForm(false);
        await fetchFamilyData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to join family');
      }
    } catch (error) {
      console.error('Failed to join family:', error);
      alert('Failed to join family');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from your family?')) {
      return;
    }

    try {
      const response = await fetch('/api/family/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        await fetchFamilyData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const canInviteMore = isOwner && familyMembers.length < 4;
  const hasFamilySubscription = subscription?.tier === 'family';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-display text-2xl font-bold text-dream-blue">
            BabelBooks
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/stories" className="text-gray-700 hover:text-dream-blue">
              My Stories
            </Link>
            <Link href="/profile" className="text-gray-700 hover:text-dream-blue">
              Profile
            </Link>
            <Link
              href="/create"
              className="bg-storybook-violet text-white px-4 py-2 rounded-full text-sm font-semibold"
            >
              Create Story
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Family Management</h1>

        {/* Subscription Status */}
        {!hasFamilySubscription && familyMembers.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-lg mb-2">Family Subscription Required</h3>
            <p className="text-gray-700 mb-4">
              Upgrade to a Family subscription to invite up to 3 family members and share 30 stories per month.
            </p>
            <Link
              href="/subscription"
              className="inline-block bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700"
            >
              View Family Plans
            </Link>
          </div>
        )}

        {/* Join Family Form */}
        {!isOwner && familyMembers.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Join a Family</h2>
            <p className="text-gray-600 mb-4">
              Have an invitation code? Enter it below to join a family account.
            </p>
            
            {!showJoinForm ? (
              <button
                onClick={() => setShowJoinForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Enter Invitation Code
              </button>
            ) : (
              <form onSubmit={handleJoinFamily} className="space-y-4">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invitation code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                  >
                    Join Family
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoinForm(false)}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Family Members */}
        {familyMembers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Family Members</h2>
              <span className="text-sm text-gray-600">
                {familyMembers.length} of 4 members
              </span>
            </div>

            <div className="space-y-3">
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {member.name || member.email}
                      {member.isOwner && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          Owner
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{member.email}</div>
                    {member.joinedAt && (
                      <div className="text-xs text-gray-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  {isOwner && !member.isOwner && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Family Usage Stats */}
            {subscription && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Family Usage This Month</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stories Created</span>
                  <span className="font-semibold">
                    {subscription.usage.storiesUsed} / {subscription.usage.storiesLimit}
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${(subscription.usage.storiesUsed / subscription.usage.storiesLimit) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invite Members */}
        {isOwner && canInviteMore && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Invite Family Members</h2>
            
            {!showInviteForm ? (
              <button
                onClick={() => setShowInviteForm(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                Invite New Member
              </button>
            ) : (
              <form onSubmit={handleInviteMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="family.member@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                  >
                    Send Invitation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail('');
                    }}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">Pending Invitations</h3>
                <div className="space-y-2">
                  {pendingInvitations.map((invitation, index) => (
                    <div
                      key={index}
                      className="text-sm p-2 bg-gray-50 rounded flex justify-between items-center"
                    >
                      <span>{invitation.email}</span>
                      <span className="text-xs text-gray-500">
                        Code: {invitation.inviteCode}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">About Family Accounts</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Family accounts can have up to 4 members total</li>
            <li>• All members share 30 stories per month</li>
            <li>• Members get unlimited story replays</li>
            <li>• Access to the Essential Story Collection</li>
            <li>• Only the account owner can invite or remove members</li>
          </ul>
        </div>
      </div>
    </div>
  );
}