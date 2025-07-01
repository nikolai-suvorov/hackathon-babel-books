import { hashPassword, verifyPassword, createToken, verifyToken } from '@/lib/auth';
import { SignJWT, jwtVerify } from 'jose';

jest.mock('jose');

describe('Auth Library', () => {
  const mockSecret = new TextEncoder().encode('test-secret');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      const isValid = await verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hashedPassword);

      expect(isValid).toBe(false);
    });
  });

  describe('createToken', () => {
    it('should create a JWT token with payload', async () => {
      const mockSign = jest.fn().mockResolvedValue('mock-token');
      const mockSetExpirationTime = jest.fn().mockReturnThis();
      const mockSetIssuedAt = jest.fn().mockReturnThis();
      const mockSetProtectedHeader = jest.fn().mockReturnThis();

      (SignJWT as jest.Mock).mockImplementation(() => ({
        setProtectedHeader: mockSetProtectedHeader,
        setIssuedAt: mockSetIssuedAt,
        setExpirationTime: mockSetExpirationTime,
        sign: mockSign,
      }));

      const payload = {
        userId: '123',
        email: 'test@example.com',
        subscriptionTier: 'free',
      };

      const token = await createToken(payload);

      expect(token).toBe('mock-token');
      expect(SignJWT).toHaveBeenCalledWith(payload);
      expect(mockSetProtectedHeader).toHaveBeenCalledWith({ alg: 'HS256' });
      expect(mockSetIssuedAt).toHaveBeenCalled();
      expect(mockSetExpirationTime).toHaveBeenCalledWith('7d');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const mockPayload = {
        userId: '123',
        email: 'test@example.com',
        subscriptionTier: 'free',
      };

      (jwtVerify as jest.Mock).mockResolvedValue({ payload: mockPayload });

      const result = await verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(jwtVerify).toHaveBeenCalledWith('valid-token', expect.any(Uint8Array));
    });

    it('should return null for invalid token', async () => {
      (jwtVerify as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const result = await verifyToken('invalid-token');

      expect(result).toBeNull();
    });
  });
});