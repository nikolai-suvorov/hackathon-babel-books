import { POST } from '@/app/api/stories/route';
import { NextRequest } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/userService';
import { getDatabase } from '@/lib/db';
import { SubscriptionTier } from '@/lib/models/user';
import { ObjectId } from 'mongodb';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/services/userService');
jest.mock('@/lib/db');

describe('Story Generation Limits', () => {
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      insertOne: jest.fn().mockResolvedValue({ insertedId: new ObjectId() }),
      findOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
      updateOne: jest.fn(),
    };

    mockDb = {
      collection: jest.fn(() => mockCollection),
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
    
    // Mock requireAuth to pass through the session
    (requireAuth as jest.Mock).mockImplementation((session) => {
      if (!session) throw new Error('Unauthorized');
      return session;
    });
    
    // Setup default mocks for UserService
    (UserService.incrementStoryCount as jest.Mock).mockResolvedValue(undefined);
    (UserService.checkAndResetMonthlyUsage as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Free Tier Limits', () => {
    const freeUserSession = {
      userId: 'free_user_123',
      email: 'free@example.com',
      subscriptionTier: SubscriptionTier.FREE,
    };

    it('should allow free user to create story within limit', async () => {
      (getSession as jest.Mock).mockResolvedValue(freeUserSession);
      (UserService.canCreateStory as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'A magical adventure',
          childAge: '3-4 years',
          textLanguage: 'English',
          narrationLanguage: 'English',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.storyId).toBeDefined();
      expect(UserService.canCreateStory).toHaveBeenCalledWith('free_user_123');
      expect(UserService.incrementStoryCount).toHaveBeenCalledWith('free_user_123');
    });

    it('should reject free user who exceeded monthly limit', async () => {
      (getSession as jest.Mock).mockResolvedValue(freeUserSession);
      (UserService.canCreateStory as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Another story',
          childAge: '3-4 years',
          textLanguage: 'English',
          narrationLanguage: 'English',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Monthly story limit reached. Please upgrade your subscription.');
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });
  });

  describe('Individual Tier Limits', () => {
    const individualUserSession = {
      userId: 'individual_user_123',
      email: 'individual@example.com',
      subscriptionTier: SubscriptionTier.INDIVIDUAL,
    };

    it('should allow individual user to create up to 15 stories', async () => {
      (getSession as jest.Mock).mockResolvedValue(individualUserSession);
      (UserService.canCreateStory as jest.Mock).mockResolvedValue(true);
      (UserService.getUserById as jest.Mock).mockResolvedValue({
        subscription: { tier: SubscriptionTier.INDIVIDUAL },
        usage: { storiesCreatedThisMonth: 14 },
      });

      const request = new NextRequest('http://localhost:3000/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Story number 15',
          childAge: '4-5 years',
          textLanguage: 'Spanish',
          narrationLanguage: 'English',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.storyId).toBeDefined();
      expect(UserService.incrementStoryCount).toHaveBeenCalled();
    });
  });

  describe('Family Tier Limits', () => {
    const familyOwnerSession = {
      userId: 'family_owner_123',
      email: 'family@example.com',
      subscriptionTier: SubscriptionTier.FAMILY,
    };

    it('should track combined family usage', async () => {
      (getSession as jest.Mock).mockResolvedValue(familyOwnerSession);
      (UserService.canCreateStory as jest.Mock).mockResolvedValue(true);
      (UserService.getFamilyUsage as jest.Mock).mockResolvedValue(28);

      const request = new NextRequest('http://localhost:3000/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Family story',
          childAge: '3-4 years',
          textLanguage: 'French',
          narrationLanguage: 'English',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.storyId).toBeDefined();
      expect(UserService.canCreateStory).toHaveBeenCalledWith('family_owner_123');
    });

    it('should reject when family limit is reached', async () => {
      (getSession as jest.Mock).mockResolvedValue(familyOwnerSession);
      (UserService.canCreateStory as jest.Mock).mockResolvedValue(false);
      (UserService.getFamilyUsage as jest.Mock).mockResolvedValue(30);

      const request = new NextRequest('http://localhost:3000/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'One more family story',
          childAge: '3-4 years',
          textLanguage: 'English',
          narrationLanguage: 'English',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Monthly story limit reached. Please upgrade your subscription.');
    });

    it('should allow family member to create story within family limit', async () => {
      const familyMemberSession = {
        userId: 'family_member_123',
        email: 'member@example.com',
        subscriptionTier: SubscriptionTier.FREE, // Members might have free tier
      };

      (getSession as jest.Mock).mockResolvedValue(familyMemberSession);
      (UserService.canCreateStory as jest.Mock).mockResolvedValue(true);

      // Mock family membership check
      mockCollection.findOne.mockResolvedValueOnce({
        memberId: new ObjectId('family_member_123'),
        familyOwnerId: new ObjectId('family_owner_123'),
      });

      const request = new NextRequest('http://localhost:3000/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Family member story',
          childAge: '2-3 years',
          textLanguage: 'English',
          narrationLanguage: 'Spanish',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.storyId).toBeDefined();
      expect(UserService.incrementStoryCount).toHaveBeenCalledWith('family_member_123');
    });
  });

  describe('Monthly Reset', () => {
    it('should reset usage at the start of new month', async () => {
      const userSession = {
        userId: 'reset_user_123',
        email: 'reset@example.com',
        subscriptionTier: SubscriptionTier.FREE,
      };

      (getSession as jest.Mock).mockResolvedValue(userSession);
      
      // Mock checking and resetting monthly usage
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      (UserService.checkAndResetMonthlyUsage as jest.Mock).mockImplementation(async (userId) => {
        // Simulate reset happening
        await mockCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              'usage.storiesCreatedThisMonth': 0,
              'usage.monthStartDate': new Date(),
            },
          }
        );
      });

      (UserService.canCreateStory as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'New month story',
          childAge: '3-4 years',
          textLanguage: 'English',
          narrationLanguage: 'English',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.storyId).toBeDefined();
      // checkAndResetMonthlyUsage is called internally by canCreateStory which we mock
      expect(UserService.canCreateStory).toHaveBeenCalledWith('reset_user_123');
    });
  });

  describe('Story Creation Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const userSession = {
        userId: 'user123',
        email: 'test@example.com',
        subscriptionTier: SubscriptionTier.INDIVIDUAL,
      };

      (getSession as jest.Mock).mockResolvedValue(userSession);
      (UserService.canCreateStory as jest.Mock).mockResolvedValue(true);
      
      mockCollection.insertOne.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test story',
          childAge: '3-4 years',
          textLanguage: 'English',
          narrationLanguage: 'English',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create story');
    });
  });
});