'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

interface Story {
  _id: string;
  title: string;
  prompt: string;
  childAge: string;
  textLanguage: string;
  narrationLanguage?: string;
  tone: string;
  createdAt: string;
  coverImage?: string;
  isShared?: boolean;
  shareData?: {
    likes: number;
    views: number;
  };
}

export default function StoriesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [subscription, setSubscription] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchStories();
      fetchSubscription();
    }
  }, [user, authLoading, router]);

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
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

  const handleMarketplaceShare = async (storyId: string, currentlyShared: boolean) => {
    // Check if user has paid subscription
    if (subscription?.tier === 'free') {
      alert('Only paid subscribers can share stories to the marketplace. Please upgrade your subscription.');
      return;
    }

    try {
      if (currentlyShared) {
        // Unshare story
        const response = await fetch(`/api/stories/${storyId}/share`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setStories(stories.map(story => 
            story._id === storyId ? { ...story, isShared: false } : story
          ));
        }
      } else {
        // Share story
        const response = await fetch('/api/marketplace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId,
            isPublic: true,
            tags: [],
            ageGroups: [stories.find(s => s._id === storyId)?.childAge || ''],
            languages: [stories.find(s => s._id === storyId)?.textLanguage || 'English']
          })
        });
        
        if (response.ok) {
          setStories(stories.map(story => 
            story._id === storyId ? { ...story, isShared: true } : story
          ));
          alert('Story shared to marketplace successfully!');
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to share story');
        }
      }
    } catch (error) {
      console.error('Failed to share/unshare story:', error);
      alert('Failed to share story');
    }
  };

  const handlePrivateShare = async () => {
    if (!selectedStoryId || !shareEmail) return;

    try {
      const response = await fetch(`/api/stories/${selectedStoryId}/share-private`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: shareEmail,
          expiresInDays: 7 // Share for 7 days
        })
      });

      if (response.ok) {
        alert(`Story shared with ${shareEmail} successfully!`);
        setShowShareModal(false);
        setShareEmail('');
        setSelectedStoryId(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to share story');
      }
    } catch (error) {
      console.error('Failed to share story:', error);
      alert('Failed to share story');
    }
  };

  const handleDelete = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story?')) {
      return;
    }

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setStories(stories.filter(story => story._id !== storyId));
      }
    } catch (error) {
      console.error('Failed to delete story:', error);
      alert('Failed to delete story');
    }
  };

  const filteredStories = stories
    .filter(story => {
      if (filter === 'shared') return story.isShared;
      if (filter === 'private') return !story.isShared;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  if (authLoading || loading) {
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
            <Link href="/marketplace" className="text-gray-700 hover:text-dream-blue">
              Marketplace
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

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display text-4xl font-bold text-dream-blue">
            My Stories
          </h1>
          
          <Link
            href="/create"
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all transform hover:scale-105"
          >
            ✨ Create New Story
          </Link>
        </div>

        {/* Filters and Sort */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Stories</option>
                <option value="private">Private Only</option>
                <option value="shared">Shared Only</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="recent">Most Recent</option>
                <option value="title">Title</option>
              </select>
            </div>
            
            <div className="ml-auto text-sm text-gray-600">
              {stories.length} {stories.length === 1 ? 'story' : 'stories'} total
            </div>
          </div>
        </div>

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              {filter === 'all' ? 'No stories yet' : `No ${filter} stories`}
            </h2>
            <p className="text-gray-600 mb-6">
              Start creating magical stories for your little ones!
            </p>
            <Link
              href="/create"
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700"
            >
              Create Your First Story
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => (
              <div
                key={story._id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {story.coverImage ? (
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center">
                    <span className="text-6xl">📖</span>
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold mb-2">
                    {story.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {story.prompt}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {story.childAge}
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {story.textLanguage}
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      {story.tone}
                    </span>
                    {story.narrationLanguage && story.narrationLanguage !== story.textLanguage && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        🗣️ {story.narrationLanguage}
                      </span>
                    )}
                  </div>
                  
                  {story.isShared && story.shareData && (
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span>❤️ {story.shareData.likes}</span>
                      <span>👁️ {story.shareData.views}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/stories/${story._id}`}
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Read Story →
                    </Link>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedStoryId(story._id);
                          setShowShareModal(true);
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                        title="Share with user"
                      >
                        👤
                      </button>
                      
                      <button
                        onClick={() => handleMarketplaceShare(story._id, story.isShared || false)}
                        className={`p-2 rounded-full hover:bg-gray-100 ${
                          story.isShared ? 'text-green-600' : 'text-gray-400'
                        }`}
                        title={story.isShared ? 'Unshare from marketplace' : 'Share to marketplace'}
                      >
                        {story.isShared ? '🌐' : '🔒'}
                      </button>
                      
                      <button
                        onClick={() => handleDelete(story._id)}
                        className="p-2 rounded-full hover:bg-red-50 text-red-500"
                        title="Delete story"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Private Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Share Story Privately</h2>
              
              <p className="text-sm text-gray-600 mb-4">
                Share this story with another user. They will be able to read it for 7 days.
              </p>
              
              <input
                type="email"
                placeholder="Enter user email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              />
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEmail('');
                    setSelectedStoryId(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrivateShare}
                  disabled={!shareEmail}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}