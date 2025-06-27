'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface StoryPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  interactiveElement?: string;
}

interface Story {
  id: string;
  prompt: string;
  ageGroup: string;
  tone: string;
  language: string;
  narrationLanguage: string;
  status: string;
  story?: {
    title: string;
    metadata: any;
    pages: StoryPage[];
  };
}

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For now, load from sessionStorage (mock implementation)
    const storyData = sessionStorage.getItem('storyData');
    if (storyData) {
      setStory(JSON.parse(storyData));
      setIsLoading(false);
    } else {
      // In a real app, fetch from API
      setIsLoading(false);
    }
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

  if (!story || !story.story) {
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
          {/* Image Placeholder */}
          <div className="aspect-video bg-gradient-to-br from-sunshine-yellow to-coral-pink relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <p className="text-6xl mb-4">🖼️</p>
                <p className="text-lg font-medium px-4">{currentPageData.imagePrompt}</p>
              </div>
            </div>
            
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

            {/* Language Info */}
            {story.language !== story.narrationLanguage && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <span>📖 Text: {story.language}</span>
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