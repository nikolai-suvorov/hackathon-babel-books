import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarketplacePage from '@/app/marketplace/page';
import { useAuth } from '@/lib/contexts/AuthContext';

// Mock modules
jest.mock('@/lib/contexts/AuthContext');
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch
global.fetch = jest.fn();
global.alert = jest.fn();

describe('MarketplacePage', () => {
  const mockUser = { id: '123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('should display marketplace stories', async () => {
    const mockStories = [
      {
        _id: 'shared1',
        storyId: '1',
        ownerName: 'John Doe',
        sharedAt: '2024-01-01',
        tags: ['educational'],
        likes: 10,
        views: 50,
        isLiked: false,
        story: {
          title: 'The Learning Tree',
          prompt: 'A story about learning',
          childAge: '3-4 years',
          textLanguage: 'English',
          tone: 'educational',
        },
      },
      {
        _id: 'shared2',
        storyId: '2',
        ownerName: 'Jane Smith',
        sharedAt: '2024-01-02',
        tags: ['adventure'],
        likes: 5,
        views: 25,
        isLiked: true,
        story: {
          title: 'Ocean Adventure',
          coverImage: 'ocean.jpg',
          prompt: 'An underwater journey',
          childAge: '4-5 years',
          textLanguage: 'Spanish',
          tone: 'adventurous',
        },
      },
    ];

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stories: mockStories }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('The Learning Tree')).toBeInTheDocument();
      expect(screen.getByText('Ocean Adventure')).toBeInTheDocument();
    });

    expect(screen.getByText('A story about learning')).toBeInTheDocument();
    expect(screen.getByText('by John Doe')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // likes
    expect(screen.getByText('50')).toBeInTheDocument(); // views
  });

  it('should handle filter changes', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
    });

    // Change filters
    await user.selectOptions(screen.getByLabelText(/language/i), 'Spanish');
    await user.selectOptions(screen.getByLabelText(/age group/i), '3-4 years');
    await user.click(screen.getByLabelText(/essential collection only/i));

    // Verify API calls with filters
    await waitFor(() => {
      const lastCall = (global.fetch as jest.Mock).mock.calls.pop();
      expect(lastCall[0]).toContain('language=Spanish');
      expect(lastCall[0]).toContain('ageGroup=3-4+years');
      expect(lastCall[0]).toContain('essential=true');
    });
  });

  it('should handle sorting', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stories: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });

    // Change sort order
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'recent');

    await waitFor(() => {
      const lastCall = (global.fetch as jest.Mock).mock.calls.pop();
      expect(lastCall[0]).toContain('sort=recent');
    });

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'likes');

    await waitFor(() => {
      const lastCall = (global.fetch as jest.Mock).mock.calls.pop();
      expect(lastCall[0]).toContain('sort=likes');
    });
  });

  it('should handle like/unlike when authenticated', async () => {
    const user = userEvent.setup();
    const mockStories = [
      {
        _id: 'shared1',
        storyId: '1',
        ownerName: 'John Doe',
        sharedAt: '2024-01-01',
        tags: [],
        likes: 10,
        views: 50,
        isLiked: false,
        story: {
          title: 'Test Story',
          prompt: 'A test story',
          childAge: '3-4 years',
          textLanguage: 'English',
        },
      },
    ];

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stories: mockStories }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Click like button
    const likeButton = screen.getByRole('button', { name: /🤍/ });
    await user.click(likeButton);

    expect(global.fetch).toHaveBeenCalledWith('/api/stories/1/like', {
      method: 'POST',
    });

    // Like count should update
    await waitFor(() => {
      expect(screen.getByText('11')).toBeInTheDocument();
    });
  });

  it('should show alert when liking without authentication', async () => {
    const user = userEvent.setup();
    const mockStories = [
      {
        _id: 'shared1',
        storyId: '1',
        ownerName: 'John Doe',
        sharedAt: '2024-01-01',
        tags: [],
        likes: 10,
        views: 50,
        story: {
          title: 'Test Story',
          prompt: 'A test story',
          childAge: '3-4 years',
          textLanguage: 'English',
        },
      },
    ];

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stories: mockStories }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Click like button without auth
    const likeButton = screen.getByRole('button', { name: /🤍/ });
    await user.click(likeButton);

    expect(global.alert).toHaveBeenCalledWith('Please sign in to like stories');
  });

  it('should navigate to story details on click', async () => {
    const user = userEvent.setup();
    const mockStories = [
      {
        _id: 'shared1',
        storyId: '123',
        ownerName: 'John Doe',
        sharedAt: '2024-01-01',
        tags: [],
        likes: 10,
        views: 50,
        story: {
          title: 'Clickable Story',
          prompt: 'Click me',
          childAge: '3-4 years',
          textLanguage: 'English',
        },
      },
    ];

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stories: mockStories }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Clickable Story')).toBeInTheDocument();
    });

    // Click on story card (not the like button)
    const storyCard = screen.getByText('Clickable Story').closest('div[class*="cursor-pointer"]');
    await user.click(storyCard!);

    expect(mockPush).toHaveBeenCalledWith('/stories/123');
  });

  it('should display loading state', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    render(<MarketplacePage />);

    expect(screen.getByText(/loading stories/i)).toBeInTheDocument();
  });

  it('should display empty state', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stories: [] }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText(/no stories found/i)).toBeInTheDocument();
    });
  });

  it('should display story metadata correctly', async () => {
    const mockStories = [
      {
        _id: 'shared1',
        storyId: '1',
        ownerName: 'Author Name',
        sharedAt: '2024-01-01',
        tags: ['fun', 'educational'],
        likes: 15,
        views: 100,
        isLiked: true,
        story: {
          title: 'Metadata Test',
          prompt: 'Testing metadata display',
          childAge: '0-6 months',
          textLanguage: 'French',
          tone: 'magical',
        },
      },
    ];

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stories: mockStories }),
    });

    render(<MarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Metadata Test')).toBeInTheDocument();
    });

    // Check all metadata is displayed
    expect(screen.getByText('0-6 months')).toBeInTheDocument();
    expect(screen.getByText('French')).toBeInTheDocument();
    expect(screen.getByText('magical')).toBeInTheDocument();
    expect(screen.getByText('fun')).toBeInTheDocument();
    expect(screen.getByText('❤️')).toBeInTheDocument(); // Liked heart
    expect(screen.getByText('15')).toBeInTheDocument(); // Like count
    expect(screen.getByText('100')).toBeInTheDocument(); // View count
  });
});