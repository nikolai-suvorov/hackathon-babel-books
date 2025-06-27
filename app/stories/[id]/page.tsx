'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface StoryPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  interactiveElement?: string;
  image?: {
    imageData: string;
    format: string;
  };
  audio?: {
    audioData: string;
    duration: number;
    format: string;
  };
}

interface Story {
  _id: string;
  prompt: string;
  childName?: string;
  childAge: string;
  childInterests?: string;
  textLanguage: string;
  narrationLanguage: string;
  tone: string;
  status: string;
  story?: {
    title: string;
    metadata: any;
    pages: StoryPage[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`/api/stories?id=${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch story');
        }
        const data = await response.json();
        setStory(data);
        
        // If story is still pending, poll for updates
        if (data.status === 'pending' || data.status === 'processing') {
          const pollInterval = setInterval(async () => {
            const pollResponse = await fetch(`/api/stories?id=${params.id}`);
            if (pollResponse.ok) {
              const pollData = await pollResponse.json();
              setStory(pollData);
              if (pollData.status === 'completed' || pollData.status === 'failed') {
                clearInterval(pollInterval);
              }
            }
          }, 2000); // Poll every 2 seconds
          
          return () => clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error fetching story:', error);
        // For demo, create a mock story
        setStory({
          _id: params.id as string,
          prompt: 'Demo story',
          childAge: '3-4 years',
          textLanguage: 'English',
          narrationLanguage: 'English',
          tone: 'playful',
          status: 'completed',
          story: {
            title: 'Demo Story',
            metadata: {},
            pages: [
              {
                pageNumber: 1,
                text: 'This is a demo story. The real story is being generated...',
                imagePrompt: 'A colorful illustration',
                interactiveElement: 'Tap to continue',
              },
              {
                pageNumber: 2,
                text: 'The end of our demo story!',
                imagePrompt: 'A happy ending',
                interactiveElement: 'Tap to celebrate!',
              },
            ],
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStory();
  }, [params.id]);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && story && currentPage < story.story!.pages.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, story]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-soft-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-dream-blue mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-600">Loading your story...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-soft-white to-blue-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-600 mb-4">Story not found</p>
          <Link
            href="/create"
            className="inline-block bg-dream-blue text-white px-6 py-3 rounded-full hover:bg-opacity-90"
          >
            Create a New Story
          </Link>
        </div>
      </div>
    );
  }

  // Handle different story statuses
  if (story.status === 'pending' || story.status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-soft-white to-blue-50">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-dream-blue mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Creating Your Story</h2>
            <p className="text-gray-600 mb-4">
              {story.status === 'pending' ? 'Your story is in the queue...' : 'Writing magical words...'}
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                <strong>Prompt:</strong> {story.prompt}
              </p>
              {story.childName && (
                <p className="text-sm text-gray-700 mt-1">
                  <strong>For:</strong> {story.childName}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500">This usually takes 10-30 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  if (story.status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-soft-white to-blue-50">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              We couldn't create your story. This might be due to high demand or a temporary issue.
            </p>
            <div className="space-y-3">
              <Link
                href="/create"
                className="block w-full bg-dream-blue text-white px-6 py-3 rounded-full hover:bg-opacity-90"
              >
                Try Again
              </Link>
              <button
                onClick={() => router.back()}
                className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-full hover:bg-gray-300"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!story.story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-soft-white to-blue-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-600 mb-4">Story content not available</p>
          <Link
            href="/create"
            className="inline-block bg-dream-blue text-white px-6 py-3 rounded-full hover:bg-opacity-90"
          >
            Create a New Story
          </Link>
        </div>
      </div>
    );
  }

  const { pages } = story.story;
  const currentPageData = pages[currentPage];
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === pages.length - 1;

  const goToNextPage = () => {
    if (!isLastPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (!isFirstPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const playAudio = (audioData: string | undefined) => {
    if (!audioData) return;
    
    try {
      // For mock audio, just log it
      const mockData = JSON.parse(atob(audioData));
      if (mockData.type === 'mock_audio') {
        console.log('Mock audio would play:', mockData);
        alert(`🔊 Playing narration for page ${mockData.page} (${mockData.duration}s)`);
        return;
      }
    } catch {
      // Real audio data - create audio element and play
      const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        alert('Unable to play audio at this time');
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl font-bold text-dream-blue"
          >
            {process.env.NEXT_PUBLIC_PRODUCT_NAME}
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Page {currentPage + 1} of {pages.length}
            </span>
            <Link
              href="/create"
              className="bg-mint-green text-gray-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-opacity-90"
            >
              New Story
            </Link>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="font-display text-3xl font-bold text-center text-dream-blue mb-8">
          {story.story.title}
        </h1>

        {/* Story Page */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Story Image */}
          <div className="aspect-video bg-gradient-to-br from-sunshine-yellow to-coral-pink relative overflow-hidden">
            {currentPageData.image?.imageData ? (
              <img 
                src={`data:image/${currentPageData.image.format || 'png'};base64,${currentPageData.image.imageData}`}
                alt={currentPageData.imagePrompt}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <p className="text-6xl mb-4">🖼️</p>
                  <p className="text-lg font-medium px-4">{currentPageData.imagePrompt}</p>
                </div>
              </div>
            )}
            
            {/* Interactive Element Indicator */}
            {currentPageData.interactiveElement && (
              <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 rounded-full px-4 py-2 shadow-lg">
                <p className="text-sm font-medium text-gray-700">
                  ✨ {currentPageData.interactiveElement}
                </p>
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className="p-8">
            <p className="text-xl leading-relaxed text-gray-800 font-body">
              {currentPageData.text}
            </p>

            {/* Audio Controls */}
            {currentPageData.audio?.audioData && (
              <div className="mt-6 bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => playAudio(currentPageData.audio?.audioData)}
                    className="bg-dream-blue text-white p-3 rounded-full hover:bg-opacity-90 transition-all transform hover:scale-105"
                    aria-label="Play narration"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Listen to the story</p>
                    <p className="text-xs text-gray-500">Duration: {currentPageData.audio.duration}s</p>
                  </div>
                </div>
              </div>
            )}

            {/* Language Info */}
            {story.textLanguage !== story.narrationLanguage && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <span>📖 Text: {story.textLanguage}</span>
                <span>•</span>
                <span>🔊 Narration: {story.narrationLanguage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={goToPreviousPage}
            disabled={isFirstPage}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
              isFirstPage
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-dream-blue text-white hover:bg-opacity-90 transform hover:scale-105'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          {/* Page Indicators */}
          <div className="flex gap-2">
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentPage
                    ? 'bg-dream-blue w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNextPage}
            disabled={isLastPage}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
              isLastPage
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-dream-blue text-white hover:bg-opacity-90 transform hover:scale-105'
            }`}
          >
            Next
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Story Complete Message */}
        {isLastPage && (
          <div className="mt-8 text-center">
            <p className="text-2xl font-display font-bold text-dream-blue mb-4">
              The End! 🎉
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setCurrentPage(0)}
                className="bg-storybook-violet text-white px-6 py-3 rounded-full font-medium hover:bg-opacity-90"
              >
                Read Again
              </button>
              <Link
                href="/create"
                className="bg-mint-green text-gray-800 px-6 py-3 rounded-full font-medium hover:bg-opacity-90"
              >
                Create Another Story
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}