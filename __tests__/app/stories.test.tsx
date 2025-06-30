import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoriesPage from '@/app/stories/page';
import { useAuth } from '@/lib/contexts/AuthContext';

// Mock modules
jest.mock('@/lib/contexts/AuthContext');
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// Mock fetch
global.fetch = jest.fn();

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('StoriesPage', () => {
  const mockUser = { id: '123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('should redirect to login when not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<StoriesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should display loading state', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: true,
    });

    render(<StoriesPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should fetch and display user stories', async () => {
    const mockStories = [
      {
        _id: '1',
        title: 'The Magic Forest',
        prompt: 'A story about a magical forest',
        childAge: '3-4 years',
        textLanguage: 'English',
        tone: 'magical',
        createdAt: '2024-01-01',
        isShared: false,
      },
      {
        _id: '2',
        title: 'Space Adventure',
        prompt: 'A journey through space',
        childAge: '4-5 years',
        textLanguage: 'Spanish',
        narrationLanguage: 'English',
        tone: 'adventurous',
        createdAt: '2024-01-02',
        isShared: true,
        shareData: { likes: 5, views: 20 },
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

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('The Magic Forest')).toBeInTheDocument();
      expect(screen.getByText('Space Adventure')).toBeInTheDocument();
    });

    expect(screen.getByText('A story about a magical forest')).toBeInTheDocument();
    expect(screen.getByText('3-4 years')).toBeInTheDocument();
    expect(screen.getByText('❤️ 5')).toBeInTheDocument();
    expect(screen.getByText('👁️ 20')).toBeInTheDocument();
  });

  it('should filter stories', async () => {
    const user = userEvent.setup();
    const mockStories = [
      {
        _id: '1',
        title: 'Private Story',
        prompt: 'A private story',
        childAge: '3-4 years',
        textLanguage: 'English',
        tone: 'funny',
        createdAt: '2024-01-01',
        isShared: false,
      },
      {
        _id: '2',
        title: 'Shared Story',
        prompt: 'A shared story',
        childAge: '4-5 years',
        textLanguage: 'Spanish',
        tone: 'magical',
        createdAt: '2024-01-02',
        isShared: true,
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

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Private Story')).toBeInTheDocument();
      expect(screen.getByText('Shared Story')).toBeInTheDocument();
    });

    // Filter to show only shared stories
    const filterSelect = screen.getByLabelText(/filter/i);
    await user.selectOptions(filterSelect, 'shared');

    expect(screen.queryByText('Private Story')).not.toBeInTheDocument();
    expect(screen.getByText('Shared Story')).toBeInTheDocument();

    // Filter to show only private stories
    await user.selectOptions(filterSelect, 'private');

    expect(screen.getByText('Private Story')).toBeInTheDocument();
    expect(screen.queryByText('Shared Story')).not.toBeInTheDocument();
  });

  it('should sort stories', async () => {
    const user = userEvent.setup();
    const mockStories = [
      {
        _id: '1',
        title: 'Alpha Story',
        prompt: 'First alphabetically',
        childAge: '3-4 years',
        textLanguage: 'English',
        tone: 'funny',
        createdAt: '2024-01-02',
      },
      {
        _id: '2',
        title: 'Beta Story',
        prompt: 'Second alphabetically',
        childAge: '4-5 years',
        textLanguage: 'Spanish',
        tone: 'magical',
        createdAt: '2024-01-01',
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

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Story')).toBeInTheDocument();
    });

    // By default, should be sorted by recent (createdAt)
    const storyTitles = screen.getAllByRole('heading', { level: 3 });
    expect(storyTitles[0]).toHaveTextContent('Alpha Story');
    expect(storyTitles[1]).toHaveTextContent('Beta Story');

    // Sort by title
    const sortSelect = screen.getByLabelText(/sort by/i);
    await user.selectOptions(sortSelect, 'title');

    const sortedTitles = screen.getAllByRole('heading', { level: 3 });
    expect(sortedTitles[0]).toHaveTextContent('Alpha Story');
    expect(sortedTitles[1]).toHaveTextContent('Beta Story');
  });

  it('should handle share/unshare story', async () => {
    const user = userEvent.setup();
    const mockStories = [
      {
        _id: '1',
        title: 'Test Story',
        prompt: 'A test story',
        childAge: '3-4 years',
        textLanguage: 'English',
        tone: 'funny',
        createdAt: '2024-01-01',
        isShared: false,
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

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Click share button
    const shareButton = screen.getByTitle('Share to marketplace');
    await user.click(shareButton);

    expect(global.fetch).toHaveBeenCalledWith('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId: '1',
        isPublic: true,
        tags: [],
        ageGroups: ['3-4 years'],
        languages: ['English'],
      }),
    });
  });

  it('should handle delete story', async () => {
    const user = userEvent.setup();
    const mockStories = [
      {
        _id: '1',
        title: 'Story to Delete',
        prompt: 'This will be deleted',
        childAge: '3-4 years',
        textLanguage: 'English',
        tone: 'funny',
        createdAt: '2024-01-01',
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

    // Mock window.confirm
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Story to Delete')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByTitle('Delete story');
    await user.click(deleteButton);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this story?');
    expect(global.fetch).toHaveBeenCalledWith('/api/stories/1', {
      method: 'DELETE',
    });

    // Story should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('Story to Delete')).not.toBeInTheDocument();
    });

    mockConfirm.mockRestore();
  });

  it('should display empty state when no stories', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stories: [] }),
    });

    render(<StoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('No stories yet')).toBeInTheDocument();
      expect(screen.getByText('Start creating magical stories for your little ones!')).toBeInTheDocument();
      expect(screen.getByText('Create Your First Story')).toBeInTheDocument();
    });
  });
});