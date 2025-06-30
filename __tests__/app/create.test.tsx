import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateStoryPage from '@/app/create/page';
import { useAuth } from '@/lib/contexts/AuthContext';

// Mock modules
jest.mock('@/lib/contexts/AuthContext');

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch
global.fetch = jest.fn();
global.alert = jest.fn();

describe('CreateStoryPage', () => {
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

    render(<CreateStoryPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should render all form fields', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(<CreateStoryPage />);

    expect(screen.getByLabelText(/what is your story about/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/child's name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/child's interests/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/child's age/i)).toBeInTheDocument();
    expect(screen.getByText(/tone of the story/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/story language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/narration language/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(<CreateStoryPage />);

    // Submit button should be disabled initially
    const submitButton = screen.getByRole('button', { name: /generate my story/i });
    expect(submitButton).toBeDisabled();

    // Fill in required fields
    await user.type(screen.getByLabelText(/what is your story about/i), 'A magical adventure');
    await user.selectOptions(screen.getByLabelText(/child's age/i), '3-4 years');

    // Submit button should now be enabled
    expect(submitButton).toBeEnabled();
  });

  it('should submit story creation', async () => {
    const user = userEvent.setup();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ storyId: 'story123' }),
    });

    render(<CreateStoryPage />);

    // Fill in form
    await user.type(screen.getByLabelText(/what is your story about/i), 'A magical adventure');
    await user.type(screen.getByLabelText(/child's name/i), 'Emma');
    await user.type(screen.getByLabelText(/child's interests/i), 'dinosaurs, space');
    await user.selectOptions(screen.getByLabelText(/child's age/i), '3-4 years');
    
    // Select tone
    await user.click(screen.getByRole('button', { name: /magical/i }));

    // Submit form
    await user.click(screen.getByRole('button', { name: /generate my story/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'A magical adventure',
          childName: 'Emma',
          childAge: '3-4 years',
          childInterests: 'dinosaurs, space',
          tone: 'magical',
          textLanguage: 'English',
          narrationLanguage: 'English',
        }),
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/stories/story123');
  });

  it('should handle story creation errors', async () => {
    const user = userEvent.setup();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Monthly story limit reached' }),
    });

    render(<CreateStoryPage />);

    // Fill in minimal required fields
    await user.type(screen.getByLabelText(/what is your story about/i), 'Test story');
    await user.selectOptions(screen.getByLabelText(/child's age/i), '3-4 years');

    // Submit form
    await user.click(screen.getByRole('button', { name: /generate my story/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Monthly story limit reached');
    });

    // Should not navigate on error
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should handle tone selection', async () => {
    const user = userEvent.setup();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(<CreateStoryPage />);

    // Click different tone buttons
    const funnyButton = screen.getByRole('button', { name: /funny/i });
    const magicalButton = screen.getByRole('button', { name: /magical/i });

    await user.click(funnyButton);
    expect(funnyButton).toHaveClass('bg-sunshine-yellow');

    await user.click(magicalButton);
    expect(magicalButton).toHaveClass('bg-storybook-violet');
    expect(funnyButton).not.toHaveClass('bg-sunshine-yellow');
  });

  it('should handle random tone selection', async () => {
    const user = userEvent.setup();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(<CreateStoryPage />);

    const randomButton = screen.getByRole('button', { name: /random/i });
    await user.click(randomButton);

    // Check that one of the tone buttons is selected
    const toneButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('Funny') ||
      btn.textContent?.includes('Magical') ||
      btn.textContent?.includes('Scary') ||
      btn.textContent?.includes('Wholesome') ||
      btn.textContent?.includes('Adventurous')
    );

    const selectedButton = toneButtons.find(btn => 
      btn.className.includes('bg-') && !btn.className.includes('bg-gray')
    );

    expect(selectedButton).toBeTruthy();
  });

  it('should handle language selection', async () => {
    const user = userEvent.setup();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(<CreateStoryPage />);

    const storyLanguageSelect = screen.getByLabelText(/story language/i);
    const narrationLanguageSelect = screen.getByLabelText(/narration language/i);

    await user.selectOptions(storyLanguageSelect, 'Spanish');
    await user.selectOptions(narrationLanguageSelect, 'French');

    expect(storyLanguageSelect).toHaveValue('Spanish');
    expect(narrationLanguageSelect).toHaveValue('French');
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ storyId: 'story123' }),
      }), 100))
    );

    render(<CreateStoryPage />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/what is your story about/i), 'Test story');
    await user.selectOptions(screen.getByLabelText(/child's age/i), '3-4 years');

    // Submit form
    await user.click(screen.getByRole('button', { name: /generate my story/i }));

    // Should show loading state
    expect(screen.getByText(/creating your story/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/stories/story123');
    });
  });
});