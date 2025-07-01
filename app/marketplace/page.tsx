'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';

interface MarketplaceStory {
  _id: string;
  storyId: string;
  ownerName: string;
  sharedAt: string;
  tags: string[];
  likes: number;
  views: number;
  averageRating: number;
  ratingCount: number;
  isLiked?: boolean;
  story: {
    title: string;
    coverImage?: string;
    prompt: string;
    childAge: string;
    textLanguage: string;
    tone?: string;
  };
}

const AGE_GROUPS = [
  { value: '', label: 'All Ages' },
  { value: '0-6 months', label: '0-6 months' },
  { value: '6-18 months', label: '6-18 months' },
  { value: '18-36 months', label: '18-36 months' },
  { value: '3-4 years', label: '3-4 years' },
  { value: '4-5 years', label: '4-5 years' },
];

const LANGUAGES = [
  { value: '', label: 'All Languages' },
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Español' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Chinese', label: '中文' },
];

export default function MarketplacePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stories, setStories] = useState<MarketplaceStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    ageGroup: '',
    language: '',
    essential: false,
    sort: 'popular'
  });

  useEffect(() => {
    fetchStories();
  }, [filters]);

  const fetchStories = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.ageGroup) params.append('ageGroup', filters.ageGroup);
      if (filters.language) params.append('language', filters.language);
      if (filters.essential) params.append('essential', 'true');
      params.append('sort', filters.sort);

      const response = await fetch(`/api/marketplace?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStories(data.stories);
      }
    } catch (error) {
      console.error('Failed to fetch marketplace stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (storyId: string) => {
    router.push(`/stories/${storyId}`);
  };

  const handleLike = async (e: React.MouseEvent, storyId: string, isLiked: boolean) => {
    e.stopPropagation();
    
    if (!user) {
      alert('Please sign in to like stories');
      return;
    }

    try {
      const response = await fetch(`/api/stories/${storyId}/like`, {
        method: isLiked ? 'DELETE' : 'POST'
      });

      if (response.ok) {
        setStories(stories.map(story => 
          story.storyId === storyId 
            ? { ...story, likes: story.likes + (isLiked ? -1 : 1), isLiked: !isLiked }
            : story
        ));
      }
    } catch (error) {
      console.error('Failed to like/unlike story:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-display text-2xl font-bold text-dream-blue">
            BabelBooks
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
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
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-dream-blue">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-storybook-violet text-white px-4 py-2 rounded-full text-sm font-semibold"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-dream-blue mb-4">Story Marketplace</h1>
          <p className="text-xl text-gray-600">
            Discover amazing stories shared by our community
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age Group
              </label>
              <select
                value={filters.ageGroup}
                onChange={(e) => setFilters({ ...filters, ageGroup: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                {AGE_GROUPS.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={filters.language}
                onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.essential}
                  onChange={(e) => setFilters({ ...filters, essential: e.target.checked })}
                  className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Essential Collection Only
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="popular">Most Popular</option>
                <option value="recent">Most Recent</option>
                <option value="likes">Most Liked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stories Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-2">Loading stories...</span>
            </div>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No stories found matching your filters.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((item) => (
              <div
                key={item._id}
                onClick={() => handleStoryClick(item.storyId)}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
              >
                {item.story?.coverImage ? (
                  <img
                    src={item.story.coverImage}
                    alt={item.story.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center">
                    <span className="text-6xl">📚</span>
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">
                    {item.story?.title || 'Untitled Story'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {item.story?.prompt}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <span>By {item.ownerName}</span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={(e) => handleLike(e, item.storyId, item.isLiked || false)}
                        className={`flex items-center hover:scale-110 transition-transform ${
                          item.isLiked ? 'text-red-500' : ''
                        }`}
                      >
                        <span>{item.isLiked ? '❤️' : '🤍'}</span>
                        <span className="ml-1">{item.likes}</span>
                      </button>
                      <span className="flex items-center">
                        👁️ {item.views}
                      </span>
                    </div>
                  </div>
                  
                  {/* Rating Display */}
                  {item.ratingCount > 0 && (
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center">
                        <span className="text-yellow-500">⭐</span>
                        <span className="ml-1 font-medium">{item.averageRating.toFixed(1)}</span>
                        <span className="ml-1 text-gray-500">({item.ratingCount} {item.ratingCount === 1 ? 'rating' : 'ratings'})</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {item.story?.childAge}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {item.story?.textLanguage}
                    </span>
                    {item.story?.tone && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                        {item.story.tone}
                      </span>
                    )}
                    {item.tags.slice(0, 1).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}