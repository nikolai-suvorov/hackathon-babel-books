import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as session } from '@/app/api/auth/session/route';
import { NextRequest } from 'next/server';
import { UserService } from '@/lib/services/userService';
import * as auth from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/services/userService');
jest.mock('@/lib/auth');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  })),
}));

describe('Auth API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const mockUserId = '123';
      const mockToken = 'mock-jwt-token';

      (UserService.createUser as jest.Mock).mockResolvedValue(mockUserId);
      (UserService.getUserById as jest.Mock).mockResolvedValue({
        _id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        subscription: { tier: 'free' },
      });
      (auth.createToken as jest.Mock).mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await register(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'free',
      });

      expect(UserService.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });
    });

    it('should handle registration errors', async () => {
      (UserService.createUser as jest.Mock).mockRejectedValue(new Error('User already exists'));

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await register(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User already exists');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          // Missing password
        }),
      });

      const response = await register(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        subscription: { tier: 'individual' },
      };
      const mockToken = 'mock-jwt-token';

      (UserService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (auth.verifyPassword as jest.Mock).mockResolvedValue(true);
      (auth.createToken as jest.Mock).mockResolvedValue(mockToken);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const response = await login(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'individual',
      });

      expect(auth.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('should reject invalid credentials', async () => {
      const mockUser = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed-password',
      };

      (UserService.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (auth.verifyPassword as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      });

      const response = await login(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');
    });

    it('should handle non-existent user', async () => {
      (UserService.getUserByEmail as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      });

      const response = await login(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user by clearing session', async () => {
      const mockCookies = {
        delete: jest.fn(),
      };
      
      const { cookies } = require('next/headers');
      cookies.mockReturnValue(mockCookies);

      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const response = await logout(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCookies.delete).toHaveBeenCalledWith('session');
    });
  });

  describe('GET /api/auth/session', () => {
    it('should return user session when authenticated', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: 'mock-jwt-token' }),
      };
      
      const { cookies } = require('next/headers');
      cookies.mockReturnValue(mockCookies);

      (auth.verifyToken as jest.Mock).mockResolvedValue({
        userId: '123',
        email: 'test@example.com',
        subscriptionTier: 'family',
      });

      (UserService.getUserById as jest.Mock).mockResolvedValue({
        _id: '123',
        email: 'test@example.com',
        name: 'Test User',
        subscription: { tier: 'family' },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'GET',
      });

      const response = await session(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: 'family',
      });
    });

    it('should return null when not authenticated', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue(null),
      };
      
      const { cookies } = require('next/headers');
      cookies.mockReturnValue(mockCookies);

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'GET',
      });

      const response = await session(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeNull();
    });

    it('should handle invalid token', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: 'invalid-token' }),
      };
      
      const { cookies } = require('next/headers');
      cookies.mockReturnValue(mockCookies);

      (auth.verifyToken as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'GET',
      });

      const response = await session(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeNull();
    });
  });
});