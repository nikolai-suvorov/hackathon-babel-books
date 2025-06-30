import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '@/app/register/page';
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

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  it('should render registration form', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: jest.fn(),
    });

    render(<RegisterPage />);

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.getByText('🎉 Start with 2 free stories per month!')).toBeInTheDocument();
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
  });

  it('should handle successful registration', async () => {
    const user = userEvent.setup();
    const mockRegister = jest.fn().mockResolvedValue(undefined);

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: mockRegister,
    });

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
  });

  it('should validate password match', async () => {
    const user = userEvent.setup();
    const mockRegister = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: mockRegister,
    });

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'differentpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should validate password length', async () => {
    const user = userEvent.setup();
    const mockRegister = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: mockRegister,
    });

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'short');
    await user.type(confirmPasswordInput, 'short');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
    
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should handle registration error', async () => {
    const user = userEvent.setup();
    const mockRegister = jest.fn().mockRejectedValue(new Error('Email already exists'));

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: mockRegister,
    });

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  it('should disable form while registering', async () => {
    const user = userEvent.setup();
    const mockRegister = jest.fn(() => new Promise(() => {})); // Never resolves

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: mockRegister,
    });

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Creating account...');
      expect(submitButton).toBeDisabled();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    const mockRegister = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: mockRegister,
    });

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    // HTML5 validation should prevent submission
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should require all fields', async () => {
    const user = userEvent.setup();
    const mockRegister = jest.fn();

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: mockRegister,
    });

    render(<RegisterPage />);

    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    await user.click(submitButton);

    // HTML5 validation should prevent submission when fields are empty
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should link to login page', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: jest.fn(),
    });

    render(<RegisterPage />);

    const loginLink = screen.getByText('Sign in');
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should clear error when form is resubmitted', async () => {
    const user = userEvent.setup();
    const mockRegister = jest.fn()
      .mockRejectedValueOnce(new Error('Email already exists'))
      .mockResolvedValueOnce(undefined);

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      register: mockRegister,
    });

    render(<RegisterPage />);

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });

    // First attempt - fails
    await user.type(nameInput, 'Test User');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });

    // Second attempt - should clear error and succeed
    await user.clear(emailInput);
    await user.type(emailInput, 'new@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('Email already exists')).not.toBeInTheDocument();
    });

    expect(mockRegister).toHaveBeenCalledTimes(2);
  });
});