import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionPage from '@/app/subscription/page';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SubscriptionTier } from '@/lib/models/user';

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

describe('SubscriptionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('should display all subscription tiers', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    render(<SubscriptionPage />);

    // Check tier names
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Individual')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();

    // Check prices
    expect(screen.getByText('$0/month')).toBeInTheDocument();
    expect(screen.getByText('$9.99/month')).toBeInTheDocument();
    expect(screen.getByText('$19.99/month')).toBeInTheDocument();

    // Check features
    expect(screen.getByText('2 stories per month')).toBeInTheDocument();
    expect(screen.getByText('15 stories per month')).toBeInTheDocument();
    expect(screen.getByText('30 stories per month')).toBeInTheDocument();
  });

  it('should show current plan for authenticated user', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subscription: {
          tier: SubscriptionTier.INDIVIDUAL,
          isActive: true,
          usage: {
            storiesUsed: 5,
            storiesLimit: 15,
            hasEssentialAccess: true,
          },
        },
      }),
    });

    render(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Current Plan')).toBeInTheDocument();
      expect(screen.getByText('5 of 15 stories used this month')).toBeInTheDocument();
    });
  });

  it('should handle subscription upgrade', async () => {
    const user = userEvent.setup();

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: {
            tier: SubscriptionTier.FREE,
            isActive: true,
            usage: {
              storiesUsed: 2,
              storiesLimit: 2,
              hasEssentialAccess: false,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          checkoutUrl: 'https://checkout.stripe.com/test',
        }),
      });

    render(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Current Plan')).toBeInTheDocument();
    });

    // Click upgrade on Individual plan
    const upgradeButtons = screen.getAllByText('Upgrade');
    await user.click(upgradeButtons[0]); // First upgrade button is for Individual

    expect(global.fetch).toHaveBeenCalledWith('/api/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: SubscriptionTier.INDIVIDUAL }),
    });

    // Should redirect to Stripe checkout
    await waitFor(() => {
      expect(window.location.href).toBe('https://checkout.stripe.com/test');
    });
  });

  it('should show upgrade button only for higher tiers', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subscription: {
          tier: SubscriptionTier.INDIVIDUAL,
          isActive: true,
          usage: {
            storiesUsed: 10,
            storiesLimit: 15,
            hasEssentialAccess: true,
          },
        },
      }),
    });

    render(<SubscriptionPage />);

    await waitFor(() => {
      // Should not show upgrade for Free tier
      const freeTierCard = screen.getByText('Free').closest('.bg-white');
      expect(freeTierCard).not.toHaveTextContent('Upgrade');

      // Should show "Current Plan" for Individual
      const individualCard = screen.getByText('Individual').closest('.bg-white');
      expect(individualCard).toHaveTextContent('Current Plan');

      // Should show upgrade for Family tier
      const familyCard = screen.getByText('Family').closest('.bg-white');
      expect(familyCard).toHaveTextContent('Upgrade');
    });
  });

  it('should display feature comparisons correctly', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<SubscriptionPage />);

    // Free tier features
    const freeCard = screen.getByText('Free').closest('.bg-white');
    expect(freeCard).toHaveTextContent('2 replays per story');
    expect(freeCard).toHaveTextContent('Basic features');

    // Individual tier features
    const individualCard = screen.getByText('Individual').closest('.bg-white');
    expect(individualCard).toHaveTextContent('Unlimited replays');
    expect(individualCard).toHaveTextContent('Essential story collection');

    // Family tier features
    const familyCard = screen.getByText('Family').closest('.bg-white');
    expect(familyCard).toHaveTextContent('Up to 4 family members');
    expect(familyCard).toHaveTextContent('All premium features');
  });

  it('should show sign up prompt for unauthenticated users', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<SubscriptionPage />);

    const signUpButtons = screen.getAllByText(/Sign Up/);
    expect(signUpButtons.length).toBeGreaterThan(0);
  });

  it('should handle subscription errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscription: {
            tier: SubscriptionTier.FREE,
            isActive: true,
            usage: {
              storiesUsed: 0,
              storiesLimit: 2,
              hasEssentialAccess: false,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Payment failed',
        }),
      });

    render(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Current Plan')).toBeInTheDocument();
    });

    // Try to upgrade
    const upgradeButtons = screen.getAllByText('Upgrade');
    await user.click(upgradeButtons[0]);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled();
    });

    consoleError.mockRestore();
  });

  it('should show cancel option for active subscriptions', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subscription: {
          tier: SubscriptionTier.INDIVIDUAL,
          isActive: true,
          stripeSubscriptionId: 'sub_123',
          usage: {
            storiesUsed: 5,
            storiesLimit: 15,
            hasEssentialAccess: true,
          },
        },
      }),
    });

    render(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Cancel Subscription')).toBeInTheDocument();
    });
  });
});