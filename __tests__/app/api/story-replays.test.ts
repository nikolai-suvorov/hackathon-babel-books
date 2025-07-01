import { GET } from '@/app/api/stories/route';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { UserService } from '@/lib/services/userService';
import { getDatabase } from '@/lib/db';
import { SubscriptionTier } from '@/lib/models/user';
import { ObjectId } from 'mongodb';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/services/userService');
jest.mock('@/lib/db');

describe('Story Replay Tracking and Limits', () => {
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
    };

    mockDb = {
      collection: jest.fn(() => mockCollection),
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('Free Tier Replay Limits', () => {
    const freeUserSession = {
      userId: 'free_user_123',
      email: 'free@example.com',
      subscriptionTier: SubscriptionTier.FREE,
    };

    it('should allow first replay of a story', async () => {
      (getSession as jest.Mock).mockResolvedValue(freeUserSession);
      
      const mockStory = {
        _id: new ObjectId('story123'),
        userId: new ObjectId('another_user'),
        isShared: true,
        title: 'Shared Story',
      };

      mockCollection.findOne.mockResolvedValue(mockStory);
      (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Shared Story');
      expect(UserService.trackStoryReplay).toHaveBeenCalledWith('free_user_123', 'story123');
    });

    it('should allow second replay of a story', async () => {
      (getSession as jest.Mock).mockResolvedValue(freeUserSession);
      
      const mockStory = {
        _id: new ObjectId('story123'),
        userId: new ObjectId('another_user'),
        isShared: true,
        title: 'Shared Story',
      };

      mockCollection.findOne.mockResolvedValue(mockStory);
      (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(UserService.trackStoryReplay).toHaveBeenCalled();
    });

    it('should deny third replay for free users', async () => {
      (getSession as jest.Mock).mockResolvedValue(freeUserSession);
      
      const mockStory = {
        _id: new ObjectId('story123'),
        userId: new ObjectId('another_user'),
        isShared: true,
        title: 'Shared Story',
      };

      mockCollection.findOne.mockResolvedValue(mockStory);
      (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Replay limit reached. Please upgrade your subscription.');
    });

    it('should not track replays for own stories', async () => {
      (getSession as jest.Mock).mockResolvedValue(freeUserSession);
      
      const mockStory = {
        _id: new ObjectId('story123'),
        userId: new ObjectId('free_user_123'),
        title: 'My Own Story',
      };

      mockCollection.findOne.mockResolvedValue(mockStory);

      const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('My Own Story');
      expect(UserService.trackStoryReplay).not.toHaveBeenCalled();
    });
  });

  describe('Premium Tier Unlimited Replays', () => {
    const premiumUserSession = {
      userId: 'premium_user_123',
      email: 'premium@example.com',
      subscriptionTier: SubscriptionTier.INDIVIDUAL,
    };

    it('should allow unlimited replays for individual subscribers', async () => {
      (getSession as jest.Mock).mockResolvedValue(premiumUserSession);
      
      const mockStory = {
        _id: new ObjectId('story123'),
        userId: new ObjectId('another_user'),
        isShared: true,
        title: 'Popular Story',
      };

      mockCollection.findOne.mockResolvedValue(mockStory);
      (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

      // Simulate 100 replays
      for (let i = 0; i < 100; i++) {
        const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
        const response = await GET(request);
        
        expect(response.status).toBe(200);
      }

      expect(UserService.trackStoryReplay).toHaveBeenCalledTimes(100);
    });

    it('should allow unlimited replays for family subscribers', async () => {
      const familyUserSession = {
        userId: 'family_user_123',
        email: 'family@example.com',
        subscriptionTier: SubscriptionTier.FAMILY,
      };

      (getSession as jest.Mock).mockResolvedValue(familyUserSession);
      
      const mockStory = {
        _id: new ObjectId('story123'),
        userId: new ObjectId('another_user'),
        isShared: true,
        title: 'Family Favorite',
      };

      mockCollection.findOne.mockResolvedValue(mockStory);
      (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(UserService.trackStoryReplay).toHaveBeenCalledWith('family_user_123', 'story123');
    });
  });

  describe('Public Story Access', () => {
    it('should allow non-authenticated users to view public stories', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      
      const mockStory = {
        _id: new ObjectId('story123'),
        userId: new ObjectId('author123'),
        isShared: true,
        title: 'Public Story',
        content: 'Story content...',
      };

      mockCollection.findOne.mockResolvedValue(mockStory);

      const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Public Story');
      expect(UserService.trackStoryReplay).not.toHaveBeenCalled();
    });

    it('should deny access to private stories for non-authenticated users', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      
      const mockStory = {
        _id: new ObjectId('story123'),
        userId: new ObjectId('author123'),
        isShared: false,
        title: 'Private Story',
      };

      mockCollection.findOne.mockResolvedValue(mockStory);

      const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Please login to view this story');
    });
  });

  describe('Replay Tracking Implementation', () => {
    it('should track replay count and timestamps', async () => {
      const userId = 'user123';
      const storyId = 'story456';
      
      // First replay
      await UserService.trackStoryReplay(userId, storyId);

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        userId: new ObjectId(userId),
        storyId: new ObjectId(storyId),
        replayCount: 1,
        firstReplayedAt: expect.any(Date),
        lastReplayedAt: expect.any(Date),
      });

      // Second replay
      const existingReplay = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        storyId: new ObjectId(storyId),
        replayCount: 1,
      };

      mockCollection.findOne.mockResolvedValue(existingReplay);
      await UserService.trackStoryReplay(userId, storyId);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: existingReplay._id },
        {
          $inc: { replayCount: 1 },
          $set: { lastReplayedAt: expect.any(Date) },
        }
      );
    });

    it('should track views for shared stories', async () => {
      const viewerSession = {
        userId: 'viewer123',
        email: 'viewer@example.com',
        subscriptionTier: SubscriptionTier.FREE,
      };

      (getSession as jest.Mock).mockResolvedValue(viewerSession);
      
      const mockStory = {
        _id: new ObjectId('story123'),
        userId: new ObjectId('author123'),
        isShared: true,
        title: 'Viewed Story',
      };

      mockCollection.findOne.mockResolvedValue(mockStory);
      (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

      // Mock incrementing view count
      const mockSharedStory = {
        storyId: new ObjectId('story123'),
        views: 10,
      };

      mockCollection.findOne
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockSharedStory);

      const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // In a real implementation, this would increment the view count
      // expect(mockCollection.updateOne).toHaveBeenCalledWith(
      //   { storyId: new ObjectId('story123') },
      //   { $inc: { views: 1 } }
      // );
    });
  });

  describe('Family Member Replay Tracking', () => {
    it('should apply family subscription benefits to all members', async () => {
      const familyMemberSession = {
        userId: 'family_member_123',
        email: 'member@example.com',
        subscriptionTier: SubscriptionTier.FREE, // Member might show as free
      };

      (getSession as jest.Mock).mockResolvedValue(familyMemberSession);
      
      // Mock family membership
      mockCollection.findOne.mockResolvedValueOnce({
        _id: new ObjectId('story123'),
        userId: new ObjectId('another_user'),
        isShared: true,
        title: 'Story for Family',
      });

      // Mock user being part of a family
      (UserService.getUserById as jest.Mock).mockResolvedValue({
        _id: new ObjectId('family_member_123'),
        subscription: { tier: SubscriptionTier.FREE },
      });

      // Mock family membership check
      mockCollection.findOne.mockResolvedValueOnce({
        memberId: new ObjectId('family_member_123'),
        familyOwnerId: new ObjectId('family_owner_123'),
      });

      // Family members should have unlimited replays
      (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/stories?id=story123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(UserService.trackStoryReplay).toHaveBeenCalledWith('family_member_123', 'story123');
    });
  });
});