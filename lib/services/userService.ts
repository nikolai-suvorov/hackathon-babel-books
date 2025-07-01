import { ObjectId } from 'mongodb';
import { getDatabase } from '../db';
import { User, SubscriptionTier, SUBSCRIPTION_LIMITS, StoryReplay, SharedStory } from '../models/user';
import { hashPassword } from '../auth';

interface UserSubscription {
  tier: SubscriptionTier;
  isActive: boolean;
  startDate: Date;
  usage: {
    storiesUsed: number;
    storiesLimit: number;
    hasEssentialAccess: boolean;
  };
}

export class UserService {
  static async createUser(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<User> {
    const db = await getDatabase();
    
    // Check if user already exists
    const existing = await db.collection<User>('users').findOne({ email: data.email });
    if (existing) {
      throw new Error('User already exists');
    }
    
    const now = new Date();
    const user: User = {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      name: data.name,
      createdAt: now,
      updatedAt: now,
      subscription: {
        tier: SubscriptionTier.FREE,
        startDate: now,
        isActive: true
      },
      usage: {
        storiesCreatedThisMonth: 0,
        monthStartDate: now
      }
    };
    
    const result = await db.collection<User>('users').insertOne(user);
    return { ...user, _id: result.insertedId };
  }
  
  static async getUserById(userId: string): Promise<User | null> {
    const db = await getDatabase();
    return db.collection<User>('users').findOne({ _id: new ObjectId(userId) });
  }
  
  static async getUserByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    return db.collection<User>('users').findOne({ email });
  }
  
  static async updateSubscription(
    userId: string,
    tier: SubscriptionTier,
    stripeData?: {
      customerId: string;
      subscriptionId: string;
    }
  ): Promise<void> {
    const db = await getDatabase();
    await db.collection<User>('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          'subscription.tier': tier,
          'subscription.startDate': new Date(),
          'subscription.isActive': true,
          ...(stripeData && {
            'subscription.stripeCustomerId': stripeData.customerId,
            'subscription.stripeSubscriptionId': stripeData.subscriptionId
          })
        }
      }
    );
  }
  
  static async checkAndResetMonthlyUsage(userId: string): Promise<void> {
    const db = await getDatabase();
    const user = await this.getUserById(userId);
    if (!user) return;
    
    const now = new Date();
    const monthStart = new Date(user.usage.monthStartDate);
    
    // Reset if it's a new month
    if (now.getMonth() !== monthStart.getMonth() || now.getFullYear() !== monthStart.getFullYear()) {
      await db.collection<User>('users').updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            'usage.storiesCreatedThisMonth': 0,
            'usage.monthStartDate': now
          }
        }
      );
    }
  }
  
  static async canCreateStory(userId: string): Promise<boolean> {
    await this.checkAndResetMonthlyUsage(userId);
    
    const user = await this.getUserById(userId);
    if (!user) return false;
    
    // For family accounts, check family usage against family tier limits
    if (user.familyAccount?.ownerId) {
      const familyOwner = await this.getUserById(user.familyAccount.ownerId.toString());
      if (!familyOwner) return false;
      
      const familyLimits = SUBSCRIPTION_LIMITS[familyOwner.subscription.tier];
      const familyUsage = await this.getFamilyUsage(user.familyAccount.ownerId.toString());
      return familyUsage < familyLimits.storiesPerMonth;
    }
    
    // For individual accounts, check personal usage
    const limits = SUBSCRIPTION_LIMITS[user.subscription.tier];
    return user.usage.storiesCreatedThisMonth < limits.storiesPerMonth;
  }
  
  static async incrementStoryCount(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.collection<User>('users').updateOne(
      { _id: new ObjectId(userId) },
      { $inc: { 'usage.storiesCreatedThisMonth': 1 } }
    );
  }
  
  static async getFamilyUsage(familyOwnerId: string): Promise<number> {
    const db = await getDatabase();
    const familyMembers = await db.collection<User>('users')
      .find({
        $or: [
          { _id: new ObjectId(familyOwnerId) },
          { 'familyAccount.ownerId': new ObjectId(familyOwnerId) }
        ]
      })
      .toArray();
    
    return familyMembers.reduce((total: number, member: User) => total + member.usage.storiesCreatedThisMonth, 0);
  }
  
  static async addFamilyMember(ownerId: string, memberEmail: string): Promise<void> {
    const db = await getDatabase();
    
    const owner = await this.getUserById(ownerId);
    if (!owner || owner.subscription.tier !== SubscriptionTier.FAMILY) {
      throw new Error('Invalid family account');
    }
    
    const member = await this.getUserByEmail(memberEmail);
    if (!member) {
      throw new Error('User not found');
    }
    
    const currentMembers = await db.collection<User>('users')
      .countDocuments({ 'familyAccount.ownerId': new ObjectId(ownerId) });
    
    if (currentMembers >= SUBSCRIPTION_LIMITS[SubscriptionTier.FAMILY].maxFamilyMembers - 1) {
      throw new Error('Family member limit reached');
    }
    
    // Update member to be part of family
    await db.collection<User>('users').updateOne(
      { _id: member._id },
      {
        $set: {
          familyAccount: {
            ownerId: new ObjectId(ownerId),
            memberIds: []
          }
        }
      }
    );
  }
  
  static async trackStoryReplay(userId: string, storyId: string): Promise<boolean> {
    const db = await getDatabase();
    const user = await this.getUserById(userId);
    if (!user) return false;
    
    const limits = SUBSCRIPTION_LIMITS[user.subscription.tier];
    
    // Check existing replays
    const replay = await db.collection<StoryReplay>('storyReplays').findOne({
      userId: new ObjectId(userId),
      storyId: new ObjectId(storyId)
    });
    
    if (!replay) {
      // First replay
      await db.collection<StoryReplay>('storyReplays').insertOne({
        userId: new ObjectId(userId),
        storyId: new ObjectId(storyId),
        replayCount: 1,
        firstReplayedAt: new Date(),
        lastReplayedAt: new Date()
      });
      return true;
    }
    
    // Check replay limit
    if (limits.replaysPerStory !== 'unlimited' && replay.replayCount >= limits.replaysPerStory) {
      return false;
    }
    
    // Increment replay count
    await db.collection<StoryReplay>('storyReplays').updateOne(
      { _id: replay._id },
      {
        $inc: { replayCount: 1 },
        $set: { lastReplayedAt: new Date() }
      }
    );
    
    return true;
  }
  
  static async shareStory(
    storyId: string,
    userId: string,
    options: {
      isPublic: boolean;
      tags: string[];
      ageGroups: string[];
      languages: string[];
    }
  ): Promise<void> {
    const db = await getDatabase();
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');
    
    const sharedStory: SharedStory = {
      storyId: new ObjectId(storyId),
      ownerId: new ObjectId(userId),
      ownerName: user.name,
      sharedAt: new Date(),
      isPublic: options.isPublic,
      tags: options.tags,
      likes: 0,
      views: 0,
      isEssential: false,
      ageGroups: options.ageGroups,
      languages: options.languages,
      ratings: [],
      averageRating: 0,
      ratingCount: 0
    };
    
    await db.collection<SharedStory>('sharedStories').insertOne(sharedStory);
  }
  
  static async getUserSubscription(userId: string): Promise<UserSubscription> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const db = await getDatabase();
    
    // Check if user is part of a family
    const familyMembership = await db.collection('familyMembers').findOne({
      memberId: new ObjectId(userId)
    });
    
    if (familyMembership) {
      // User is a family member, get family owner's subscription
      const familyOwner = await this.getUserById(familyMembership.familyOwnerId.toString());
      if (!familyOwner) {
        throw new Error('Family owner not found');
      }
      
      const limits = SUBSCRIPTION_LIMITS[familyOwner.subscription.tier];
      const familyUsage = await this.getFamilyUsage(familyMembership.familyOwnerId.toString());
      
      return {
        tier: familyOwner.subscription.tier,
        isActive: familyOwner.subscription.isActive,
        startDate: familyOwner.subscription.startDate,
        usage: {
          storiesUsed: familyUsage,
          storiesLimit: limits.storiesPerMonth,
          hasEssentialAccess: limits.hasEssentialAccess
        }
      };
    }
    
    // Regular user or family owner
    const limits = SUBSCRIPTION_LIMITS[user.subscription.tier];
    let storiesUsed = user.usage.storiesCreatedThisMonth;
    
    if (user.subscription.tier === SubscriptionTier.FAMILY) {
      storiesUsed = await this.getFamilyUsage(userId);
    }
    
    return {
      tier: user.subscription.tier,
      isActive: user.subscription.isActive,
      startDate: user.subscription.startDate,
      usage: {
        storiesUsed,
        storiesLimit: limits.storiesPerMonth,
        hasEssentialAccess: limits.hasEssentialAccess
      }
    };
  }
}