import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoryPage from '@/app/stories/[id]/page';

// Mock modules
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-story-id' }),
  useRouter: () => ({ 
    back: jest.fn(),
  }),
}));

jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

jest.mock('@/components/InteractiveStoryPage', () => {
  return ({ text, pageNumber, onPageComplete }: any) => (
    <div data-testid="interactive-story-page">
      <h2>Page {pageNumber}</h2>
      <p>{text}</p>
      <button onClick={() => onPageComplete && onPageComplete()}>Complete Page</button>
    </div>
  );
});

jest.mock('@/components/PageFlipAnimation', () => {
  return ({ children }: any) => <div data-testid="page-flip-animation">{children}</div>;
});

jest.mock('@/components/BackgroundMusic', () => {
  return ({ enabled }: any) => (
    <div data-testid="background-music" data-enabled={enabled}></div>
  );
});

// Mock fetch
global.fetch = jest.fn();
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
}));

describe('StoryPage', () => {
  const mockCompletedStory = {
    _id: 'test-story-id',
    prompt: 'A story about a brave knight',
    childName: 'Alice',
    childAge: '3-4 years',
    textLanguage: 'English',
    narrationLanguage: 'English',
    tone: 'playful',
    status: 'completed',
    story: {
      title: 'The Brave Knight',
      metadata: {},
      pages: [
        {
          pageNumber: 1,
          text: 'Once upon a time, there was a brave knight.',
          imagePrompt: 'A knight in shining armor',
          image: {
            url: 'https://example.com/image1.png',
            format: 'png',
          },
          audio: {
            url: 'https://example.com/audio1.mp3',
            duration: 10,
            format: 'mp3',
          },
        },
        {
          pageNumber: 2,
          text: 'The knight went on many adventures.',
          imagePrompt: 'Knight on an adventure',
          image: {
            url: 'https://example.com/image2.png',
            format: 'png',
          },
          audio: {
            url: 'https://example.com/audio2.mp3',
            duration: 8,
            format: 'mp3',
          },
        },
        {
          pageNumber: 3,
          text: 'And they all lived happily ever after.',
          imagePrompt: 'Happy ending',
          image: {
            url: 'https://example.com/image3.png',
            format: 'png',
          },
          audio: {
            url: 'https://example.com/audio3.mp3',
            duration: 5,
            format: 'mp3',
          },
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Default fetch mock for all tests
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/auth/session')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ user: { id: 'user-123' } }),
        });
      }
      // Default to returning completed story
      return Promise.resolve({
        ok: true,
        json: async () => mockCompletedStory,
      });
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should display completed story', async () => {
    // Fetch is already mocked in beforeEach
    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('The Brave Knight')).toBeInTheDocument();
    });

    expect(screen.getByText('Once upon a time, there was a brave knight.')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should navigate between pages', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Once upon a time, there was a brave knight.')).toBeInTheDocument();
    });

    // Click next button
    await user.click(screen.getByText('Next'));

    expect(screen.getByText('The knight went on many adventures.')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

    // Click previous button
    await user.click(screen.getByText('Previous'));

    expect(screen.getByText('Once upon a time, there was a brave knight.')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<StoryPage />);

    expect(screen.getByText('Loading your story...')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show generation in progress', async () => {
    const pendingStory = {
      ...mockCompletedStory,
      status: 'generating_text',
      story: undefined,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => pendingStory,
    });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Story is Being Created')).toBeInTheDocument();
    });

    expect(screen.getByText('Hold tight! This might take a few minutes...')).toBeInTheDocument();
    expect(screen.getByText('Writing your story')).toBeInTheDocument();
    // Text is inside paragraph elements with formatting
    expect(screen.getByText('A story about a brave knight')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    const failedStory = {
      ...mockCompletedStory,
      status: 'failed',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => failedStory,
    });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('should handle music toggle', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('The Brave Knight')).toBeInTheDocument();
    });

    const musicControl = screen.getByLabelText('Mute background music');
    const backgroundMusic = screen.getByTestId('background-music');

    expect(backgroundMusic).toHaveAttribute('data-enabled', 'true');

    await user.click(musicControl);

    expect(backgroundMusic).toHaveAttribute('data-enabled', 'false');
    expect(screen.getByLabelText('Enable background music')).toBeInTheDocument();
  });

  it('should handle auto-play toggle', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletedStory,
    });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('The Brave Knight')).toBeInTheDocument();
    });

    const autoPlayControl = screen.getByLabelText('Enable auto-play');
    
    await user.click(autoPlayControl);

    expect(screen.getByLabelText('Disable auto-play')).toBeInTheDocument();
  });

  it('should handle page complete with auto-play', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletedStory,
    });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('The Brave Knight')).toBeInTheDocument();
    });

    // Enable auto-play
    await user.click(screen.getByLabelText('Enable auto-play'));

    // Complete the page
    await user.click(screen.getByText('Complete Page'));

    // Should advance to next page after delay
    await waitFor(() => {
      expect(screen.getByText('The knight went on many adventures.')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should show end screen on last page', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletedStory,
    });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('The Brave Knight')).toBeInTheDocument();
    });

    // Navigate to last page
    await user.click(screen.getByText('Next'));
    await user.click(screen.getByText('Next'));

    expect(screen.getByText('And they all lived happily ever after.')).toBeInTheDocument();
    expect(screen.getByText('The End! 🎉')).toBeInTheDocument();
    expect(screen.getByText('Read Again')).toBeInTheDocument();
    expect(screen.getByText('Create Another Story')).toBeInTheDocument();
  });

  it('should allow reading story again', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletedStory,
    });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('The Brave Knight')).toBeInTheDocument();
    });

    // Navigate to last page
    await user.click(screen.getByText('Next'));
    await user.click(screen.getByText('Next'));

    // Click read again
    await user.click(screen.getByText('Read Again'));

    expect(screen.getByText('Once upon a time, there was a brave knight.')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('should handle page indicators', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletedStory,
    });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('The Brave Knight')).toBeInTheDocument();
    });

    // Click on page indicator (third page)
    const pageIndicators = screen.getAllByRole('button').filter(btn => 
      btn.className.includes('rounded-full') && !btn.textContent
    );
    
    await user.click(pageIndicators[2]);

    expect(screen.getByText('And they all lived happily ever after.')).toBeInTheDocument();
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
  });

  it('should handle story not found', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch story'));

    render(<StoryPage />);

    // The component creates a demo story on error
    await waitFor(() => {
      expect(screen.getByText('Demo Story')).toBeInTheDocument();
    });

    expect(screen.getByText('This is a demo story. The real story is being generated...')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletedStory,
    });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('The Brave Knight')).toBeInTheDocument();
    });

    // Press right arrow key
    await waitFor(() => {
      const rightArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      window.dispatchEvent(rightArrowEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('The knight went on many adventures.')).toBeInTheDocument();
    });

    // Press left arrow key
    await waitFor(() => {
      const leftArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      window.dispatchEvent(leftArrowEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('Once upon a time, there was a brave knight.')).toBeInTheDocument();
    });
  });

  it('should poll for updates when story is pending', async () => {
    const pendingStory = {
      ...mockCompletedStory,
      status: 'pending',
      story: undefined,
    };

    const completedStory = mockCompletedStory;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => pendingStory,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => completedStory,
      });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Story is Being Created')).toBeInTheDocument();
    });

    // Wait for polling to complete
    await waitFor(() => {
      expect(screen.getByText('The Brave Knight')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show interstitial when no pages are ready', async () => {
    const storyGenerating = {
      _id: 'test-story-id',
      prompt: 'A story about a brave knight',
      childName: 'Alice',
      childAge: '3-4 years',
      textLanguage: 'English',
      narrationLanguage: 'English',
      tone: 'playful',
      status: 'generating_assets',
      story: {
        title: 'The Brave Knight',
        metadata: {},
        pages: [], // No pages ready yet
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Override the default mock to return generating story
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/auth/session')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ user: { id: 'user-123' } }),
        });
      }
      // Return generating story for this test
      return Promise.resolve({
        ok: true,
        json: async () => storyGenerating,
      });
    });

    render(<StoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Story is Being Created')).toBeInTheDocument();
    });

    expect(screen.getByText('Hold tight! This might take a few minutes...')).toBeInTheDocument();
    expect(screen.getByText('Creating beautiful illustrations')).toBeInTheDocument();
  });
});