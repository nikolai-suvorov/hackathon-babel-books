import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';
import { useAuth } from '@/lib/contexts/AuthContext';

// Mock the auth context
jest.mock('@/lib/contexts/AuthContext');

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the home page with product name', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<HomePage />);

    expect(screen.getAllByText('BabelBooks')).toBeTruthy();
    expect(screen.getByText(/Transform simple prompts into magical/)).toBeInTheDocument();
  });

  it('should show login/register buttons when not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<HomePage />);

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign Up Free')).toBeInTheDocument();
    expect(screen.getByText('Start Free with 2 Stories ✨')).toBeInTheDocument();
  });

  it('should show create story button when authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    render(<HomePage />);

    expect(screen.getByText('Create Your Next Story ✨')).toBeInTheDocument();
    expect(screen.getByText('My Stories')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  it('should display all feature cards', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<HomePage />);

    expect(screen.getByText('AI-Generated Illustrations')).toBeInTheDocument();
    expect(screen.getByText('Multilingual Support')).toBeInTheDocument();
    expect(screen.getByText('Interactive & Musical')).toBeInTheDocument();
  });

  it('should display age groups', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<HomePage />);

    expect(screen.getByText('Perfect for Every Age')).toBeInTheDocument();
    expect(screen.getByText('0-6m')).toBeInTheDocument();
    expect(screen.getByText('3-4y')).toBeInTheDocument();
    expect(screen.getByText('4-5y')).toBeInTheDocument();
  });

  it('should display subscription tiers', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<HomePage />);

    expect(screen.getByText('Choose Your Adventure')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('Individual')).toBeInTheDocument();
    expect(screen.getByText('$9.99/mo')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
    expect(screen.getByText('$19.99/mo')).toBeInTheDocument();
  });

  it('should display correct subscription features', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<HomePage />);

    // Free tier features
    expect(screen.getByText('✓ 2 stories/month')).toBeInTheDocument();
    expect(screen.getByText('✓ 2 replays/story')).toBeInTheDocument();

    // Individual tier features
    expect(screen.getByText('✓ 15 stories/month')).toBeInTheDocument();
    expect(screen.getByText('✓ Unlimited replays')).toBeInTheDocument();

    // Family tier features
    expect(screen.getByText('✓ 30 stories/month')).toBeInTheDocument();
    expect(screen.getByText('✓ Up to 4 members')).toBeInTheDocument();
  });

  it('should not show final CTA when authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    });

    render(<HomePage />);

    expect(screen.getByText('Ready to Create Magic?')).toBeInTheDocument();
    expect(screen.queryByText('Start Your Free Account')).not.toBeInTheDocument();
  });
});