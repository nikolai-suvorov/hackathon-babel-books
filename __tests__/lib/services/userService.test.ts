import { UserService } from '@/lib/services/userService';
import { getDatabase } from '@/lib/db';
import { SubscriptionTier } from '@/lib/models/user';
import { ObjectId } from 'mongodb';

jest.mock('@/lib/db');
jest.mock('@/lib/auth');

describe('UserService', () => {
  let mockDb: any;
  let mockCollection: any;
  let mockUsersCollection: any;
  let mockFamilyMembersCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUsersCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
    };

    mockFamilyMembersCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
    };

    mockCollection = mockUsersCollection; // Default for backward compatibility

    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'familyMembers') {
          return mockFamilyMembersCollection;
        }
        return mockUsersCollection;
      }),
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('createUser', () => {
    it('should create a new user with default subscription', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
      };

      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

      const userId = await UserService.createUser(userData);

      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          name: userData.name,
          subscription: expect.objectContaining({
            tier: SubscriptionTier.FREE,
            isActive: true,
          }),
          usage: expect.objectContaining({
            storiesCreatedThisMonth: 0,
          }),
        })
      );
      expect(userId).toBeDefined();
    });

    it('should throw error if user already exists', async () => {
      mockCollection.findOne.mockResolvedValue({ email: 'test@example.com' });

      await expect(UserService.createUser({
        email: 'test@example.com',
        password: 'password',
        name: 'Test',
      })).rejects.toThrow('User already exists');
    });
  });

  describe('canCreateStory', () => {
    it('should allow free users to create up to 2 stories', async () => {
      const userId = '123';
      const freeUser = {
        _id: new ObjectId(userId),
        subscription: { tier: SubscriptionTier.FREE },
        usage: { storiesCreatedThisMonth: 1, monthStartDate: new Date() },
      };

      mockCollection.findOne.mockResolvedValue(freeUser);

      const canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(true);
    });

    it('should deny free users who reached limit', async () => {
      const userId = '123';
      const freeUser = {
        _id: new ObjectId(userId),
        subscription: { tier: SubscriptionTier.FREE },
        usage: { storiesCreatedThisMonth: 2, monthStartDate: new Date() },
      };

      mockCollection.findOne.mockResolvedValue(freeUser);

      const canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(false);
    });

    it('should allow individual users to create up to 15 stories', async () => {
      const userId = '123';
      const individualUser = {
        _id: new ObjectId(userId),
        subscription: { tier: SubscriptionTier.INDIVIDUAL },
        usage: { storiesCreatedThisMonth: 14, monthStartDate: new Date() },
      };

      mockCollection.findOne.mockResolvedValue(individualUser);

      const canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(true);
    });

    it('should check family usage for family members', async () => {
      const userId = '123';
      const familyOwnerId = '456';
      
      // Mock family member - needs to be called by checkAndResetMonthlyUsage first, then by getUserById, then family owner
      mockUsersCollection.findOne
        .mockResolvedValueOnce({
          _id: new ObjectId(userId),
          subscription: { tier: SubscriptionTier.FREE },
          usage: { storiesCreatedThisMonth: 1, monthStartDate: new Date() },
          familyAccount: { ownerId: new ObjectId(familyOwnerId) }
        })
        .mockResolvedValueOnce({
          _id: new ObjectId(userId),
          subscription: { tier: SubscriptionTier.FREE },
          usage: { storiesCreatedThisMonth: 1, monthStartDate: new Date() },
          familyAccount: { ownerId: new ObjectId(familyOwnerId) }
        })
        .mockResolvedValueOnce({
          _id: new ObjectId(familyOwnerId),
          subscription: { tier: SubscriptionTier.FAMILY },
        });

      // Mock family usage calculation - includes owner and member
      mockUsersCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { 
            _id: new ObjectId(familyOwnerId),
            usage: { storiesCreatedThisMonth: 10 } 
          },
          { 
            _id: new ObjectId(userId),
            familyAccount: { ownerId: new ObjectId(familyOwnerId) },
            usage: { storiesCreatedThisMonth: 5 } 
          },
        ]),
      });

      const canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(true); // 15 < 30 family limit
    });
  });

  describe('getUserSubscription', () => {
    it('should return user subscription details', async () => {
      const userId = '123';
      const user = {
        _id: new ObjectId(userId),
        subscription: { 
          tier: SubscriptionTier.INDIVIDUAL,
          isActive: true,
          startDate: new Date(),
        },
        usage: { storiesCreatedThisMonth: 5 },
      };

      mockCollection.findOne.mockResolvedValue(user);

      const subscription = await UserService.getUserSubscription(userId);

      expect(subscription).toEqual({
        tier: SubscriptionTier.INDIVIDUAL,
        isActive: true,
        startDate: user.subscription.startDate,
        usage: {
          storiesUsed: 5,
          storiesLimit: 15,
          hasEssentialAccess: true,
        },
      });
    });

    it('should return family subscription for family members', async () => {
      const userId = '123';
      const familyOwnerId = '456';
      
      // First call: getUserById for the user
      mockUsersCollection.findOne.mockResolvedValueOnce({
        _id: new ObjectId(userId),
        subscription: { tier: SubscriptionTier.FREE },
      });
      
      // Second call: check familyMembers collection
      mockFamilyMembersCollection.findOne.mockResolvedValueOnce({
        memberId: new ObjectId(userId),
        familyOwnerId: new ObjectId(familyOwnerId)
      });
      
      // Third call: getUserById for family owner
      mockUsersCollection.findOne.mockResolvedValueOnce({
        _id: new ObjectId(familyOwnerId),
        subscription: { 
          tier: SubscriptionTier.FAMILY,
          isActive: true,
          startDate: new Date(),
        },
      });

      // Mock family usage calculation
      mockUsersCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { usage: { storiesCreatedThisMonth: 10 } },
          { usage: { storiesCreatedThisMonth: 8 } },
        ]),
      });

      const subscription = await UserService.getUserSubscription(userId);

      expect(subscription.tier).toBe(SubscriptionTier.FAMILY);
      expect(subscription.usage.storiesUsed).toBe(18);
      expect(subscription.usage.storiesLimit).toBe(30);
    });
  });

  describe('trackStoryReplay', () => {
    it('should track first replay', async () => {
      const userId = '123';
      const storyId = '456';
      const user = {
        _id: new ObjectId(userId),
        subscription: { tier: SubscriptionTier.FREE },
      };

      mockCollection.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null); // No existing replay

      const canReplay = await UserService.trackStoryReplay(userId, storyId);

      expect(canReplay).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: new ObjectId(userId),
          storyId: new ObjectId(storyId),
          replayCount: 1,
        })
      );
    });

    it('should deny replay when limit reached for free users', async () => {
      const userId = '123';
      const storyId = '456';
      const user = {
        _id: new ObjectId(userId),
        subscription: { tier: SubscriptionTier.FREE },
      };
      const existingReplay = {
        userId: new ObjectId(userId),
        storyId: new ObjectId(storyId),
        replayCount: 2,
      };

      mockCollection.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(existingReplay);

      const canReplay = await UserService.trackStoryReplay(userId, storyId);

      expect(canReplay).toBe(false);
    });

    it('should allow unlimited replays for premium users', async () => {
      const userId = '123';
      const storyId = '456';
      const user = {
        _id: new ObjectId(userId),
        subscription: { tier: SubscriptionTier.INDIVIDUAL },
      };
      const existingReplay = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        storyId: new ObjectId(storyId),
        replayCount: 100,
      };

      mockCollection.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(existingReplay);

      const canReplay = await UserService.trackStoryReplay(userId, storyId);

      expect(canReplay).toBe(true);
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: existingReplay._id },
        expect.objectContaining({
          $inc: { replayCount: 1 },
        })
      );
    });
  });
});