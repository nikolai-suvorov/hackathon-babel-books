import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { SharedStory, StoryLike, SubscriptionTier } from '@/lib/models/user';
import { ObjectId } from 'mongodb';
import { UserService } from '@/lib/services/userService';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.userId;
    
    const { searchParams } = new URL(request.url);
    const ageGroup = searchParams.get('ageGroup');
    const language = searchParams.get('language');
    const tags = searchParams.get('tags')?.split(',') || [];
    const isEssential = searchParams.get('essential') === 'true';
    const sort = searchParams.get('sort') || 'popular';
    
    const db = await getDatabase();
    
    // Build query
    const query: any = { isPublic: true };
    
    if (ageGroup) {
      query.ageGroups = ageGroup;
    }
    
    if (language) {
      query.languages = language;
    }
    
    if (tags.length > 0) {
      query.tags = { $in: tags };
    }
    
    if (isEssential) {
      query.isEssential = true;
    }
    
    // Build sort options
    let sortQuery: any = {};
    switch (sort) {
      case 'recent':
        sortQuery = { sharedAt: -1 };
        break;
      case 'likes':
        sortQuery = { likes: -1, sharedAt: -1 };
        break;
      case 'popular':
      default:
        sortQuery = { views: -1, likes: -1, sharedAt: -1 };
        break;
    }
    
    // Get shared stories
    const sharedStories = await db.collection<SharedStory>('sharedStories')
      .find(query)
      .sort(sortQuery)
      .limit(50)
      .toArray();
    
    // Get story details
    const storyIds = sharedStories.map(s => s.storyId);
    const stories = await db.collection('stories')
      .find({ _id: { $in: storyIds } })
      .toArray();
    
    // If user is logged in, check which stories they've liked
    let likedStoryIds = new Set<string>();
    if (userId) {
      const likes = await db.collection<StoryLike>('storyLikes')
        .find({
          userId: new ObjectId(userId),
          storyId: { $in: storyIds }
        })
        .toArray();
      
      likedStoryIds = new Set(likes.map(l => l.storyId.toString()));
    }
    
    // Combine data
    const marketplace = sharedStories.map(shared => {
      const story = stories.find(s => s._id.toString() === shared.storyId.toString());
      return {
        ...shared,
        isLiked: likedStoryIds.has(shared.storyId.toString()),
        story: story ? {
          title: story.title,
          coverImage: story.coverImage,
          prompt: story.prompt,
          childAge: story.childAge,
          textLanguage: story.textLanguage,
          tone: story.tone
        } : null
      };
    });
    
    return NextResponse.json({ stories: marketplace });
  } catch (error) {
    console.error('Marketplace fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace stories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Please login to share stories' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { storyId, isPublic, tags, ageGroups, languages } = body;
    
    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Check if user has a paid subscription
    const userSubscription = await UserService.getUserSubscription(session.userId);
    if (userSubscription.tier === SubscriptionTier.FREE) {
      return NextResponse.json(
        { error: 'Only paid subscribers can share stories to the marketplace' },
        { status: 403 }
      );
    }
    
    // Verify user owns the story
    const story = await db.collection('stories').findOne({
      _id: new ObjectId(storyId),
      userId: new ObjectId(session.userId)
    });
    
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }
    
    // Share the story
    await db.collection<SharedStory>('sharedStories').insertOne({
      storyId: new ObjectId(storyId),
      ownerId: new ObjectId(session.userId),
      ownerName: session.email.split('@')[0], // TODO: Get from user profile
      storyData: {
        title: story.title,
        coverImage: story.coverImage,
        prompt: story.prompt,
        childAge: story.childAge,
        textLanguage: story.textLanguage,
        tone: story.tone
      },
      sharedAt: new Date(),
      isPublic: isPublic || false,
      tags: tags || [],
      likes: 0,
      views: 0,
      ratings: [],
      averageRating: 0,
      ratingCount: 0,
      isEssential: false,
      ageGroups: ageGroups || [story.childAge],
      languages: languages || [story.textLanguage]
    });
    
    // Update story as shared
    await db.collection('stories').updateOne(
      { _id: new ObjectId(storyId) },
      { $set: { isShared: true } }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Story sharing error:', error);
    return NextResponse.json(
      { error: 'Failed to share story' },
      { status: 500 }
    );
  }
}