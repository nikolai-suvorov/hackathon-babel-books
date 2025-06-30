import { ObjectId } from 'mongodb';

export enum SubscriptionTier {
  FREE = 'free',
  INDIVIDUAL = 'individual',
  FAMILY = 'family'
}

export interface SubscriptionLimits {
  storiesPerMonth: number;
  replaysPerStory: number | 'unlimited';
  maxFamilyMembers: number;
  hasEssentialAccess: boolean;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  [SubscriptionTier.FREE]: {
    storiesPerMonth: 2,
    replaysPerStory: 2,
    maxFamilyMembers: 1,
    hasEssentialAccess: false
  },
  [SubscriptionTier.INDIVIDUAL]: {
    storiesPerMonth: 15,
    replaysPerStory: 'unlimited',
    maxFamilyMembers: 1,
    hasEssentialAccess: true
  },
  [SubscriptionTier.FAMILY]: {
    storiesPerMonth: 30,
    replaysPerStory: 'unlimited',
    maxFamilyMembers: 4,
    hasEssentialAccess: true
  }
};

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  subscription: {
    tier: SubscriptionTier;
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  usage: {
    storiesCreatedThisMonth: number;
    monthStartDate: Date;
  };
  familyAccount?: {
    ownerId: ObjectId;
    memberIds: ObjectId[];
  };
  preferences?: {
    defaultLanguage?: string;
    defaultNarrationLanguage?: string;
    childProfiles?: Array<{
      name: string;
      age: string;
      interests: string;
    }>;
  };
}

export interface StoryReplay {
  _id?: ObjectId;
  userId: ObjectId;
  storyId: ObjectId;
  replayCount: number;
  lastReplayedAt: Date;
  firstReplayedAt: Date;
}

export interface SharedStory {
  _id?: ObjectId;
  storyId: ObjectId;
  ownerId: ObjectId;
  ownerName: string;
  sharedAt: Date;
  isPublic: boolean;
  tags: string[];
  likes: number;
  views: number;
  ratings: StoryRating[];
  averageRating: number;
  ratingCount: number;
  isEssential: boolean;
  ageGroups: string[];
  languages: string[];
  storyData?: {
    title: string;
    coverImage?: string;
    prompt: string;
    childAge: string;
    textLanguage: string;
    tone?: string;
  };
}

export interface StoryLike {
  _id?: ObjectId;
  userId: ObjectId;
  storyId: ObjectId;
  likedAt: Date;
}

export interface StoryRating {
  _id?: ObjectId;
  userId: ObjectId;
  storyId: ObjectId;
  rating: number; // 1-5 stars
  comment?: string;
  ratedAt: Date;
}

export interface StoryShare {
  _id?: ObjectId;
  storyId: ObjectId;
  ownerId: ObjectId;
  sharedWithUserId: ObjectId;
  sharedAt: Date;
  expiresAt?: Date;
}