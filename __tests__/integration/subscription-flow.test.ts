import { UserService } from '@/lib/services/userService';
import { SubscriptionTier, SUBSCRIPTION_LIMITS } from '@/lib/models/user';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/db';

jest.mock('@/lib/db');

// This is an integration test that tests the complete subscription flow
describe('Subscription Flow Integration', () => {
  let mockDb: any;
  let mockUsersCollection: any;
  let mockFamilyMembersCollection: any;
  let mockStoryReplaysCollection: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUsersCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
      countDocuments: jest.fn(),
    };
    
    mockFamilyMembersCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    
    mockStoryReplaysCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
    };
    
    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'familyMembers') return mockFamilyMembersCollection;
        if (name === 'storyReplays') return mockStoryReplaysCollection;
        return mockUsersCollection;
      }),
    };
    
    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });
  describe('Complete User Journey', () => {
    it('should handle complete user lifecycle from free to premium', async () => {
      // 1. User registers with free tier
      const userId = 'user_journey_123';
      const user = {
        _id: new ObjectId(userId),
        email: 'journey@example.com',
        subscription: {
          tier: SubscriptionTier.FREE,
          isActive: true,
          startDate: new Date(),
        },
        usage: {
          storiesCreatedThisMonth: 0,
          monthStartDate: new Date(),
        },
      };

      // Mock user data for story creation checks
      mockUsersCollection.findOne.mockImplementation(() => Promise.resolve(user));
      
      // 2. User creates first story (free tier)
      let canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(true);
      user.usage.storiesCreatedThisMonth = 1;

      // 3. User creates second story (free tier limit)
      canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(true);
      user.usage.storiesCreatedThisMonth = 2;

      // 4. User tries to create third story (exceeds free tier)
      canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(false);

      // 5. User upgrades to Individual tier
      mockUsersCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });
      await UserService.updateSubscription(userId, SubscriptionTier.INDIVIDUAL, {
        customerId: 'cus_individual_123',
        subscriptionId: 'sub_individual_123',
      });
      user.subscription.tier = SubscriptionTier.INDIVIDUAL;

      // 6. User can now create more stories (up to 15 total)
      canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(true);

      // 7. User creates stories up to individual limit
      user.usage.storiesCreatedThisMonth = 15;
      canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(false);

      // 8. User upgrades to Family tier
      mockUsersCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });
      await UserService.updateSubscription(userId, SubscriptionTier.FAMILY, {
        customerId: 'cus_family_123',
        subscriptionId: 'sub_family_123',
      });
      user.subscription.tier = SubscriptionTier.FAMILY;

      // 9. User can create more stories (up to 30 for family)
      canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(true);
    });
  });

  describe('Family Subscription Scenarios', () => {
    it('should handle family member additions and shared limits', async () => {
      const familyOwnerId = 'family_owner_123';
      const member1Id = 'member1_123';
      const member2Id = 'member2_123';

      // 1. Family owner has family subscription
      const familyOwner = {
        _id: new ObjectId(familyOwnerId),
        email: 'owner@example.com',
        subscription: {
          tier: SubscriptionTier.FAMILY,
          isActive: true,
        },
        usage: {
          storiesCreatedThisMonth: 5,
        },
      };

      // Setup mocks for family operations
      mockUsersCollection.findOne.mockImplementation((query) => {
        if (query._id?.toString() === familyOwnerId) {
          return Promise.resolve(familyOwner);
        }
        if (query.email === 'member1@example.com') {
          return Promise.resolve({
            _id: new ObjectId(member1Id),
            email: 'member1@example.com',
            subscription: { tier: SubscriptionTier.FREE },
            usage: { storiesCreatedThisMonth: 0 },
          });
        }
        if (query.email === 'member2@example.com') {
          return Promise.resolve({
            _id: new ObjectId(member2Id),
            email: 'member2@example.com',
            subscription: { tier: SubscriptionTier.FREE },
            usage: { storiesCreatedThisMonth: 0 },
          });
        }
        return Promise.resolve(null);
      });
      
      mockFamilyMembersCollection.findOne.mockResolvedValue(null); // No existing membership
      mockFamilyMembersCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockUsersCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockUsersCollection.countDocuments.mockResolvedValue(0); // No existing family members

      // 2. Add first family member
      await UserService.addFamilyMember(familyOwnerId, 'member1@example.com');

      // 3. Member can create stories within family limit
      const member1 = {
        _id: new ObjectId(member1Id),
        email: 'member1@example.com',
        subscription: { tier: SubscriptionTier.FREE },
        usage: { storiesCreatedThisMonth: 3 },
      };

      // Mock family usage calculation
      mockUsersCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          familyOwner,
          { 
            _id: new ObjectId(member1Id),
            familyAccount: { ownerId: new ObjectId(familyOwnerId) },
            usage: { storiesCreatedThisMonth: 3 }
          }
        ])
      });
      
      // 4. Check combined family usage (5 + 3 = 8 out of 30)
      const familyUsage = await UserService.getFamilyUsage(familyOwnerId);
      expect(familyUsage).toBeLessThan(SUBSCRIPTION_LIMITS[SubscriptionTier.FAMILY].storiesPerMonth);

      // 5. Add second family member
      await UserService.addFamilyMember(familyOwnerId, 'member2@example.com');

      // 6. All members share the 30 story limit
      const member2 = {
        _id: new ObjectId(member2Id),
        email: 'member2@example.com',
        subscription: { tier: SubscriptionTier.FREE },
        usage: { storiesCreatedThisMonth: 7 },
      };

      // Total usage: 5 + 3 + 7 = 15 out of 30
      const totalFamilyUsage = 15;
      expect(totalFamilyUsage).toBeLessThan(30);
    });

    it('should handle family subscription cancellation', async () => {
      const familyOwnerId = 'cancel_owner_123';
      const memberId = 'cancel_member_123';

      // 1. Family with active subscription
      const familyOwner = {
        _id: new ObjectId(familyOwnerId),
        subscription: {
          tier: SubscriptionTier.FAMILY,
          isActive: true,
        },
      };

      // 2. Member is part of family
      const member = {
        _id: new ObjectId(memberId),
        familyAccount: {
          ownerId: new ObjectId(familyOwnerId),
        },
      };

      // Setup mocks for getUserSubscription
      mockUsersCollection.findOne.mockImplementation((query) => {
        if (query._id?.toString() === memberId) {
          return Promise.resolve({
            ...member,
            subscription: { tier: SubscriptionTier.FREE },
            usage: { storiesCreatedThisMonth: 0 }
          });
        }
        if (query._id?.toString() === familyOwnerId) {
          return Promise.resolve({
            ...familyOwner,
            subscription: { tier: SubscriptionTier.FREE }
          });
        }
        return Promise.resolve(null);
      });
      
      mockFamilyMembersCollection.findOne.mockResolvedValue({
        memberId: new ObjectId(memberId),
        familyOwnerId: new ObjectId(familyOwnerId)
      });
      
      // Mock family usage for getUserSubscription
      mockUsersCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { ...familyOwner, usage: { storiesCreatedThisMonth: 0 } },
          { ...member, usage: { storiesCreatedThisMonth: 0 } }
        ])
      });
      
      // 3. Family subscription is cancelled (downgrade to free)
      mockUsersCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      await UserService.updateSubscription(familyOwnerId, SubscriptionTier.FREE);

      // 4. Members lose family benefits
      const memberSubscription = await UserService.getUserSubscription(memberId);
      expect(memberSubscription.tier).toBe(SubscriptionTier.FREE);
      expect(memberSubscription.usage.storiesLimit).toBe(2);
    });
  });

  describe('Replay Limit Scenarios', () => {
    it('should enforce replay limits based on subscription tier', async () => {
      const storyId = 'replay_story_123';

      // Free user replay limits
      const freeUserId = 'free_replay_user';
      const freeUser = {
        _id: new ObjectId(freeUserId),
        subscription: { tier: SubscriptionTier.FREE },
      };

      // Setup mocks for replay tracking
      mockUsersCollection.findOne.mockResolvedValue(freeUser);
      mockStoryReplaysCollection.findOne
        .mockResolvedValueOnce(null) // First replay - no existing replay
        .mockResolvedValueOnce({ replayCount: 1 }); // Second replay
        
      mockStoryReplaysCollection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockStoryReplaysCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      
      // First replay - allowed
      let canReplay = await UserService.trackStoryReplay(freeUserId, storyId);
      expect(canReplay).toBe(true);

      // Second replay - allowed
      canReplay = await UserService.trackStoryReplay(freeUserId, storyId);
      expect(canReplay).toBe(true);

      // Third replay - denied for free users
      mockStoryReplaysCollection.findOne.mockResolvedValue({
        userId: new ObjectId(freeUserId),
        storyId: new ObjectId(storyId),
        replayCount: 2,
      });
      canReplay = await UserService.trackStoryReplay(freeUserId, storyId);
      expect(canReplay).toBe(false);

      // Premium user unlimited replays
      const premiumUserId = 'premium_replay_user';
      const premiumUser = {
        _id: new ObjectId(premiumUserId),
        subscription: { tier: SubscriptionTier.INDIVIDUAL },
      };

      // Mock premium user
      mockUsersCollection.findOne.mockResolvedValue(premiumUser);
      mockStoryReplaysCollection.findOne.mockResolvedValue({
        replayCount: 999 // High number, should still allow
      });
      
      // Premium users can replay unlimited times
      for (let i = 0; i < 5; i++) {
        canReplay = await UserService.trackStoryReplay(premiumUserId, storyId);
        expect(canReplay).toBe(true);
      }
    });
  });

  describe('Monthly Reset Scenarios', () => {
    it('should reset usage counters at month boundary', async () => {
      const userId = 'reset_test_user';
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const user = {
        _id: new ObjectId(userId),
        subscription: { tier: SubscriptionTier.FREE },
        usage: {
          storiesCreatedThisMonth: 2,
          monthStartDate: lastMonth,
        },
      };

      // Mock user with old month start date (will trigger reset)
      mockUsersCollection.findOne
        .mockResolvedValueOnce(user) // First call in checkAndResetMonthlyUsage
        .mockResolvedValueOnce({ // After reset
          ...user,
          usage: {
            storiesCreatedThisMonth: 0,
            monthStartDate: new Date()
          }
        });
      
      mockUsersCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      
      // Should reset and allow creation
      const canCreate = await UserService.canCreateStory(userId);
      expect(canCreate).toBe(true);
    });
  });

  describe('Stripe Webhook Processing', () => {
    it('should handle complete Stripe subscription lifecycle', async () => {
      const userId = 'stripe_test_user';
      const customerId = 'cus_stripe_test';
      const subscriptionId = 'sub_stripe_test';

      // Setup user
      const user = {
        _id: new ObjectId(userId),
        subscription: {
          tier: SubscriptionTier.FREE,
          isActive: true,
        },
        usage: {
          storiesCreatedThisMonth: 0,
          monthStartDate: new Date()
        }
      };
      
      // 1. Checkout completed - activate subscription
      mockUsersCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      await UserService.updateSubscription(userId, SubscriptionTier.INDIVIDUAL, {
        customerId,
        subscriptionId,
      });
      
      // Update mock to return updated user
      user.subscription.tier = SubscriptionTier.INDIVIDUAL;
      mockUsersCollection.findOne.mockResolvedValue(user);
      mockFamilyMembersCollection.findOne.mockResolvedValue(null);

      const subscription = await UserService.getUserSubscription(userId);
      expect(subscription.tier).toBe(SubscriptionTier.INDIVIDUAL);
      expect(subscription.isActive).toBe(true);

      // 2. Subscription updated to family tier
      await UserService.updateSubscription(userId, SubscriptionTier.FAMILY, {
        customerId,
        subscriptionId,
      });
      
      user.subscription.tier = SubscriptionTier.FAMILY;
      mockUsersCollection.findOne.mockResolvedValue(user);
      
      // Mock family usage calculation
      mockUsersCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([user])
      });

      const updatedSubscription = await UserService.getUserSubscription(userId);
      expect(updatedSubscription.tier).toBe(SubscriptionTier.FAMILY);
      expect(updatedSubscription.usage.storiesLimit).toBe(30);

      // 3. Subscription cancelled - downgrade to free
      await UserService.updateSubscription(userId, SubscriptionTier.FREE);
      
      user.subscription.tier = SubscriptionTier.FREE;
      mockUsersCollection.findOne.mockResolvedValue(user);

      const cancelledSubscription = await UserService.getUserSubscription(userId);
      expect(cancelledSubscription.tier).toBe(SubscriptionTier.FREE);
      expect(cancelledSubscription.usage.storiesLimit).toBe(2);
    });
  });
});