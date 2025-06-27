'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import InteractiveStoryPage from '@/components/InteractiveStoryPage';
import PageFlipAnimation from '@/components/PageFlipAnimation';
import BackgroundMusic from '@/components/BackgroundMusic';

interface InteractiveZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'sound' | 'animation' | 'visual' | 'reaction';
  action: string;
  label: string;
}

interface StoryPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  interactiveElement?: string;
  interactiveZones?: InteractiveZone[];
  narratorNote?: string;
  image?: {
    imageData?: string; // For backward compatibility
    url?: string; // S3 URL
    key?: string; // S3 key
    format: string;
  };
  audio?: {
    audioData?: string; // For backward compatibility
    url?: string; // S3 URL
    key?: string; // S3 key
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
    totalPages?: number;
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
  const [pageDirection, setPageDirection] = useState<'forward' | 'backward'>('forward');
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);

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
  if (story.status === 'pending' || story.status === 'processing' || 
      story.status === 'generating_text' || story.status === 'generating_images' ||
      story.status === 'generating_audio' || story.status === 'generating_assets') {
    
    // Check if we have at least one page ready and if story generation is complete
    const hasPages = story.story?.pages && story.story.pages.length > 0;
    const totalPages = story.story?.totalPages || story.story?.metadata?.pageCount || 0;
    const allPagesReady = hasPages && (story.story?.pages?.length || 0) >= totalPages;
    
    // If story is complete but status hasn't updated, don't show interstitial
    if (allPagesReady && totalPages > 0) {
      // Let the story display
    } else if (!hasPages) {
      // If no pages are ready yet, show the interstitial
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-soft-white to-blue-50">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-6">
                <div className="animate-bounce inline-block">
                  <span className="text-6xl">📖</span>
                </div>
                <div className="animate-pulse inline-block ml-2">
                  <span className="text-6xl">✨</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                Your Story is Being Created
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                Hold tight! This might take a few minutes...
              </p>
              
              <div className="mb-6">
                <div className="bg-gray-100 rounded-lg p-4 mb-3">
                  <p className="text-sm text-gray-700">
                    <strong>Story:</strong> {story.prompt}
                  </p>
                  {story.childName && (
                    <p className="text-sm text-gray-700 mt-1">
                      <strong>For:</strong> {story.childName}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-sm">
                    <span className={`mr-2 ${story.status === 'generating_text' ? 'animate-spin' : ''}`}>
                      {story.status === 'generating_text' ? '⏳' : '✅'}
                    </span>
                    <span className={story.status === 'generating_text' ? 'text-dream-blue font-semibold' : 'text-gray-500'}>
                      Writing your story
                    </span>
                  </div>
                  <div className="flex items-center justify-center text-sm">
                    <span className={`mr-2 ${story.status === 'generating_images' || story.status === 'generating_assets' ? 'animate-spin' : ''}`}>
                      {story.status === 'generating_images' || story.status === 'generating_assets' ? '⏳' : 
                       story.status === 'generating_text' || story.status === 'pending' || story.status === 'processing' ? '⏸️' : '✅'}
                    </span>
                    <span className={story.status === 'generating_images' || story.status === 'generating_assets' ? 'text-dream-blue font-semibold' : 'text-gray-500'}>
                      Creating beautiful illustrations
                    </span>
                  </div>
                  <div className="flex items-center justify-center text-sm">
                    <span className={`mr-2 ${story.status === 'generating_audio' ? 'animate-spin' : ''}`}>
                      {story.status === 'generating_audio' ? '⏳' : '⏸️'}
                    </span>
                    <span className={story.status === 'generating_audio' ? 'text-dream-blue font-semibold' : 'text-gray-500'}>
                      Recording narration
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="animate-pulse text-xs text-gray-500">
                We're working on making your story magical...
              </div>
            </div>
          </div>
        </div>
      );
    }
    // If we have pages, let the story display (will show pages as they're ready)
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
  
  // Handle case where page is not yet generated (progressive loading)
  if (!currentPageData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-soft-white to-blue-50">
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="text-gray-600 hover:text-gray-800">
              ← Back to Home
            </Link>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="font-display text-3xl font-bold text-center text-dream-blue mb-8">
            {story.story.title || 'Your Story'}
          </h1>
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-dream-blue mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">
                Generating page {currentPage + 1}...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {pages.length > 0 ? `${pages.length} pages ready` : 'Starting generation...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === pages.length - 1;

  const goToNextPage = () => {
    if (!isLastPage) {
      setPageDirection('forward');
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (!isFirstPage) {
      setPageDirection('backward');
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handlePageComplete = () => {
    if (autoPlay && !isLastPage) {
      setTimeout(() => {
        goToNextPage();
      }, 1000); // Wait 1 second before auto-advancing
    }
  };

  const playAudio = (audioData?: { url?: string; audioData?: string }) => {
    if (!audioData) return;
    
    let audioSource: string | undefined;
    
    if (audioData.url) {
      // S3 URL
      audioSource = audioData.url;
    } else if (audioData.audioData) {
      // Base64 data (backward compatibility)
      try {
        // Check if it's mock audio
        const mockData = JSON.parse(atob(audioData.audioData));
        if (mockData.type === 'mock_audio') {
          console.log('Mock audio would play:', mockData);
          alert(`🔊 Playing narration for page ${mockData.page} (${mockData.duration}s)`);
          return;
        }
      } catch {
        // Real base64 audio data
        audioSource = `data:audio/mp3;base64,${audioData.audioData}`;
      }
    }
    
    if (!audioSource) {
      return;
    }
    
    // Play audio
    const audio = new Audio(audioSource);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      alert('Unable to play audio at this time');
    });
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

      {/* Background Music */}
      <BackgroundMusic 
        tone={story.tone as any}
        enabled={musicEnabled}
        volume={0.3}
      />

      {/* Story Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header with title and controls */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-center text-dream-blue mb-4">
            {story.story.title}
          </h1>
          
          {/* Parent Controls */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <button
              onClick={() => setMusicEnabled(!musicEnabled)}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
              aria-label={musicEnabled ? "Mute background music" : "Enable background music"}
            >
              {musicEnabled ? '🎵' : '🔇'} Music
            </button>
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
              aria-label={autoPlay ? "Disable auto-play" : "Enable auto-play"}
            >
              {autoPlay ? '▶️' : '⏸️'} Auto-play
            </button>
          </div>
        </div>

        {/* Story Page with Animation */}
        <PageFlipAnimation
          currentPage={currentPage}
          direction={pageDirection}
        >
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden p-8">
            <InteractiveStoryPage
              pageNumber={currentPageData.pageNumber}
              text={currentPageData.text}
              imageUrl={
                currentPageData.image?.url || 
                (currentPageData.image?.imageData ? 
                  `data:image/${currentPageData.image.format || 'png'};base64,${currentPageData.image.imageData}` : 
                  undefined)
              }
              imagePrompt={currentPageData.imagePrompt}
              audioUrl={
                currentPageData.audio?.url ||
                (currentPageData.audio?.audioData ?
                  `data:audio/mp3;base64,${currentPageData.audio.audioData}` :
                  undefined)
              }
              audioDuration={currentPageData.audio?.duration}
              interactiveZones={currentPageData.interactiveZones}
              onPageComplete={handlePageComplete}
              autoPlay={autoPlay}
              narrationLanguage={story.narrationLanguage}
              textLanguage={story.textLanguage}
            />
          </div>
        </PageFlipAnimation>

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