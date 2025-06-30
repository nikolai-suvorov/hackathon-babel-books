import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db';
import { ObjectId } from 'mongodb';
import { getSession, requireAuth } from '@/lib/auth';
import { UserService } from '@/lib/services/userService';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['prompt', 'childAge', 'textLanguage', 'narrationLanguage'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Check if user can create a story
    const canCreate = await UserService.canCreateStory(auth.userId);
    if (!canCreate) {
      return NextResponse.json(
        { error: 'Monthly story limit reached. Please upgrade your subscription.' },
        { status: 403 }
      );
    }

    const db = await getDatabase();
    
    // Create story document
    const story = {
      prompt: body.prompt,
      childName: body.childName || '',
      childAge: body.childAge,
      childInterests: body.childInterests || '',
      textLanguage: body.textLanguage,
      narrationLanguage: body.narrationLanguage,
      tone: body.tone || 'playful',
      status: 'pending',
      userId: new ObjectId(auth.userId),
      isShared: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert story
    const result = await db.collection('stories').insertOne(story);
    
    // Increment user's story count
    await UserService.incrementStoryCount(auth.userId);
    
    // Create a job for the worker
    const job = {
      type: 'generate_story',
      storyId: result.insertedId,
      data: story,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
    };
    
    await db.collection('jobs').insertOne(job);

    return NextResponse.json({
      storyId: result.insertedId,
      message: 'Story creation started',
    });
  } catch (error: any) {
    console.error('Story creation error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Please login to create stories' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      // List user's stories
      if (!session) {
        return NextResponse.json(
          { error: 'Please login to view your stories' },
          { status: 401 }
        );
      }
      
      const db = await getDatabase();
      const stories = await db.collection('stories')
        .find({ userId: new ObjectId(session.userId) })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      
      // Get share data for shared stories
      const sharedStoryIds = stories
        .filter(s => s.isShared)
        .map(s => s._id);
      
      let shareData: any[] = [];
      if (sharedStoryIds.length > 0) {
        shareData = await db.collection('sharedStories')
          .find({ storyId: { $in: sharedStoryIds } })
          .toArray();
      }
      
      // Combine story data with share data
      const storiesWithShareData = stories.map(story => {
        const shared = shareData.find(s => s.storyId.toString() === story._id.toString());
        return {
          ...story,
          shareData: shared ? {
            likes: shared.likes || 0,
            views: shared.views || 0
          } : undefined
        };
      });
      
      return NextResponse.json({ stories: storiesWithShareData });
    }

    const db = await getDatabase();
    const story = await db.collection('stories').findOne({
      _id: new ObjectId(id),
    });

    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }
    
    // Fetch media data for pages if story has pages
    if (story.story?.pages?.length > 0) {
      const mediaData = await db.collection('story_media')
        .find({ storyId: story._id })
        .toArray();
      
      // Map media data to pages
      story.story.pages = story.story.pages.map((page: any) => {
        const pageMedia = mediaData.find(m => m.pageNumber === page.pageNumber);
        if (pageMedia) {
          // Add media data back to page if it exists
          if (page.image?.hasImage && pageMedia.imageData) {
            page.image.imageData = pageMedia.imageData;
          }
          if (page.audio?.hasAudio && pageMedia.audioData) {
            page.audio.audioData = pageMedia.audioData;
          }
        }
        return page;
      });
    }
    
    // Check if user has access to this story
    if (session) {
      const isOwner = story.userId?.toString() === session.userId;
      const isPubliclyShared = story.isShared;
      
      // Check for private share
      const privateShare = await db.collection('storyShares').findOne({
        storyId: new ObjectId(id),
        sharedWithUserId: new ObjectId(session.userId),
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });
      
      const hasPrivateAccess = !!privateShare;
      
      if (!isOwner && !isPubliclyShared && !hasPrivateAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      // Track replay if not the owner
      if (!isOwner) {
        const canReplay = await UserService.trackStoryReplay(session.userId, id);
        if (!canReplay) {
          return NextResponse.json(
            { error: 'Replay limit reached. Please upgrade your subscription.' },
            { status: 403 }
          );
        }
      }
    } else if (!story.isShared) {
      return NextResponse.json(
        { error: 'Please login to view this story' },
        { status: 401 }
      );
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Story fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}