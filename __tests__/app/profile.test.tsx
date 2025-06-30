import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/profile/page';
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

describe('ProfilePage', () => {
  const mockUser = { 
    id: '123', 
    email: 'test@example.com',
    name: 'Test User' 
  };

  const mockSubscriptionData = {
    subscription: {
      tier: 'individual',
      isActive: true,
      usage: {
        storiesUsed: 5,
        storiesLimit: 15,
        hasEssentialAccess: true,
      },
    },
  };

  const mockUserPreferences = {
    name: 'Test User',
    defaultLanguage: 'English',
    defaultNarrationLanguage: 'English',
    childProfiles: [],
  };

  const mockFamilyData = {
    members: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    (global.fetch as jest.Mock).mockReset();
    (global.alert as jest.Mock).mockReset();
  });

  it('should redirect to login when not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      logout: jest.fn(),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should display user profile information', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      logout: jest.fn(),
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserPreferences,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamilyData,
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('My Profile')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('individual')).toBeInTheDocument();
    });

    // Check subscription usage display
    expect(screen.getByText('Stories This Month')).toBeInTheDocument();
    expect(screen.getByText('5 / 15')).toBeInTheDocument();
  });

  it('should allow editing preferences', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      logout: jest.fn(),
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserPreferences,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamilyData,
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByText('Edit');
    await user.click(editButton);

    // Edit name - find by placeholder since label doesn't have htmlFor
    const nameInput = screen.getByDisplayValue('Test User');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    // Save changes
    const saveButton = screen.getByText('Save');
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await user.click(saveButton);

    expect(global.fetch).toHaveBeenCalledWith('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Name',
        defaultLanguage: 'English',
        defaultNarrationLanguage: 'English',
        childProfiles: [],
      }),
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Preferences saved successfully!');
    });
  });

  it('should handle logout', async () => {
    const user = userEvent.setup();
    const mockLogout = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      logout: mockLogout,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserPreferences,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamilyData,
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Sign Out'));

    expect(mockLogout).toHaveBeenCalled();
  });

  it('should show family management link for family subscribers', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      logout: jest.fn(),
    });

    const familySubscriptionData = {
      subscription: {
        tier: 'family',
        isActive: true,
        usage: {
          storiesUsed: 10,
          storiesLimit: 30,
          hasEssentialAccess: true,
        },
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => familySubscriptionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserPreferences,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamilyData,
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Manage Family Members')).toBeInTheDocument();
    });
  });

  it('should manage child profiles', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      logout: jest.fn(),
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserPreferences,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamilyData,
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Child Profiles')).toBeInTheDocument();
    });

    // Enter edit mode
    await user.click(screen.getByText('Edit'));

    // Add a child
    await user.click(screen.getByText('+ Add Child'));

    // Fill child info
    const nameInputs = screen.getAllByPlaceholderText('Name');
    const lastNameInput = nameInputs[nameInputs.length - 1];
    await user.type(lastNameInput, 'Child Name');

    // There are multiple select elements, find the one for age
    const ageSelects = screen.getAllByRole('combobox');
    // The age select is the last one added (after language selects)
    const ageSelect = ageSelects[ageSelects.length - 1];
    await user.selectOptions(ageSelect, '3-4 years');

    const interestsInput = screen.getByPlaceholderText('Interests');
    await user.type(interestsInput, 'Dinosaurs, Space');

    // Save
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await user.click(screen.getByText('Save'));

    expect(global.fetch).toHaveBeenCalledWith('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('Child Name'),
    });
  });

  it('should show upgrade link for free users', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      logout: jest.fn(),
    });

    const freeSubscriptionData = {
      subscription: {
        tier: 'free',
        isActive: true,
        usage: {
          storiesUsed: 1,
          storiesLimit: 2,
          hasEssentialAccess: false,
        },
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => freeSubscriptionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserPreferences,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamilyData,
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Upgrade')).toBeInTheDocument();
    });
  });

  it('should handle preferences save error', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      logout: jest.fn(),
    });

    // Initial fetch calls for loading data
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserPreferences,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFamilyData,
      })
      // Mock error response for save attempt
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to save' }),
      });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Edit'));

    const nameInput = screen.getByDisplayValue('Test User');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to save preferences');
    });
  });

  it('should show loading state', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: true,
      logout: jest.fn(),
    });

    render(<ProfilePage />);

    // The profile page shows a spinning div without data-testid
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});