import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FamilyManagementPage from '@/app/family/page';
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
global.confirm = jest.fn();

describe('FamilyManagementPage', () => {
  const mockUser = { id: '123', email: 'owner@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    // Reset fetch mock to return rejected promise by default
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Unmocked fetch call'));
  });

  it('should redirect to login when not authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<FamilyManagementPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should display family owner view with members', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockFamilyData = {
      members: [
        { id: '123', email: 'owner@example.com', name: 'John Doe', isOwner: true },
        { id: '456', email: 'member1@example.com', name: 'Jane Doe', isOwner: false, joinedAt: '2024-01-01' },
      ],
      isOwner: true,
      memberCount: 2,
    };

    const mockSubscription = {
      tier: 'family',
      usage: { storiesUsed: 15, storiesLimit: 30 },
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/family/members') {
        return Promise.resolve({
          ok: true,
          json: async () => mockFamilyData,
        });
      }
      if (url === '/api/subscription') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ subscription: mockSubscription }),
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });

    render(<FamilyManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Family Members')).toBeInTheDocument();
      expect(screen.getByText('2 of 4 members')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Owner')).toBeInTheDocument();
    });

    // Check usage display
    expect(screen.getByText('Family Usage This Month')).toBeInTheDocument();
    expect(screen.getByText('15 / 30')).toBeInTheDocument();
  });

  it('should allow owner to invite new members', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockFamilyData = {
      members: [
        { id: '123', email: 'owner@example.com', name: 'John Doe', isOwner: true },
      ],
      isOwner: true,
      memberCount: 1,
    };

    // Setup fetch mock to handle all requests
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/family/members') {
        return Promise.resolve({
          ok: true,
          json: async () => mockFamilyData,
        });
      }
      if (url === '/api/subscription') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            subscription: { 
              tier: 'family',
              usage: { storiesUsed: 15, storiesLimit: 30 }
            } 
          }),
        });
      }
      if (url === '/api/family/invite') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ inviteCode: 'INVITE123', success: true }),
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });

    render(<FamilyManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Invite Family Members')).toBeInTheDocument();
    });

    // Click invite button
    await user.click(screen.getByText('Invite New Member'));

    // Fill and submit form
    const emailInput = screen.getByPlaceholderText('family.member@example.com');
    await user.type(emailInput, 'newmember@example.com');
    await user.click(screen.getByText('Send Invitation'));

    expect(global.fetch).toHaveBeenCalledWith('/api/family/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newmember@example.com' }),
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'Invitation sent! Share this code with newmember@example.com: INVITE123'
      );
    });
  });

  it('should allow member to join family with code', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '789', email: 'newmember@example.com' },
      loading: false,
    });

    const mockFamilyData = {
      members: [],
      isOwner: false,
      memberCount: 0,
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/family/members') {
        return Promise.resolve({
          ok: true,
          json: async () => mockFamilyData,
        });
      }
      if (url === '/api/subscription') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            subscription: { 
              tier: 'free',
              usage: { storiesUsed: 1, storiesLimit: 2 }
            } 
          }),
        });
      }
      if (url === '/api/family/invite') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });

    render(<FamilyManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Join a Family')).toBeInTheDocument();
    });

    // Click join button
    await user.click(screen.getByText('Enter Invitation Code'));

    // Enter code and submit
    const codeInput = screen.getByPlaceholderText('Enter invitation code');
    await user.type(codeInput, 'INVITE123');
    await user.click(screen.getByText('Join Family'));

    expect(global.fetch).toHaveBeenCalledWith('/api/family/invite', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'INVITE123' }),
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Successfully joined family!');
    });
  });

  it('should allow owner to remove members', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockFamilyData = {
      members: [
        { id: '123', email: 'owner@example.com', name: 'John Doe', isOwner: true },
        { id: '456', email: 'member1@example.com', name: 'Jane Doe', isOwner: false },
      ],
      isOwner: true,
      memberCount: 2,
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/family/members') {
        return Promise.resolve({
          ok: true,
          json: async () => mockFamilyData,
        });
      }
      if (url === '/api/subscription') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            subscription: { 
              tier: 'family',
              usage: { storiesUsed: 15, storiesLimit: 30 }
            } 
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    (global.confirm as jest.Mock).mockReturnValue(true);

    render(<FamilyManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Click remove button
    await user.click(screen.getByText('Remove'));

    expect(global.confirm).toHaveBeenCalledWith(
      'Are you sure you want to remove this member from your family?'
    );

    expect(global.fetch).toHaveBeenCalledWith('/api/family/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: '456' }),
    });
  });

  it('should show upgrade prompt for non-family subscribers', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockFamilyData = {
      members: [],
      isOwner: false,
      memberCount: 0,
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/family/members') {
        return Promise.resolve({
          ok: true,
          json: async () => mockFamilyData,
        });
      }
      if (url === '/api/subscription') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            subscription: { 
              tier: 'individual',
              usage: { storiesUsed: 10, storiesLimit: 15 }
            } 
          }),
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });

    render(<FamilyManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Family Subscription Required')).toBeInTheDocument();
      expect(screen.getByText('View Family Plans')).toBeInTheDocument();
    });
  });

  it('should handle invitation errors', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockFamilyData = {
      members: [
        { id: '123', email: 'owner@example.com', name: 'John Doe', isOwner: true },
      ],
      isOwner: true,
      memberCount: 1,
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/family/members') {
        return Promise.resolve({
          ok: true,
          json: async () => mockFamilyData,
        });
      }
      if (url === '/api/subscription') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            subscription: { 
              tier: 'family',
              usage: { storiesUsed: 15, storiesLimit: 30 }
            } 
          }),
        });
      }
      if (url === '/api/family/invite') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Family member limit reached' }),
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });

    render(<FamilyManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Invite New Member')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Invite New Member'));
    await user.type(screen.getByPlaceholderText('family.member@example.com'), 'test@example.com');
    await user.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Family member limit reached');
    });
  });

  it('should display pending invitations', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    const mockFamilyData = {
      members: [{ id: '123', email: 'owner@example.com', name: 'John Doe', isOwner: true }],
      isOwner: true,
      memberCount: 1,
    };

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/family/members') {
        return Promise.resolve({
          ok: true,
          json: async () => mockFamilyData,
        });
      }
      if (url === '/api/subscription') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            subscription: { 
              tier: 'family',
              usage: { storiesUsed: 15, storiesLimit: 30 }
            } 
          }),
        });
      }
      if (url === '/api/family/invite') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ inviteCode: 'CODE123', success: true }),
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });

    render(<FamilyManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Invite New Member')).toBeInTheDocument();
    });

    // Send invitation
    await user.click(screen.getByText('Invite New Member'));
    await user.type(screen.getByPlaceholderText('family.member@example.com'), 'pending@example.com');
    await user.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
      expect(screen.getByText('pending@example.com')).toBeInTheDocument();
      expect(screen.getByText('Code: CODE123')).toBeInTheDocument();
    });
  });
});