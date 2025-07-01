import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { StoryLike, SharedStory } from '@/lib/models/user';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const storyId = params.id;
    const db = await getDatabase();
    
    // Check if story is shared
    const sharedStory = await db.collection<SharedStory>('sharedStories').findOne({
      storyId: new ObjectId(storyId)
    });
    
    if (!sharedStory || !sharedStory.isPublic) {
      return NextResponse.json(
        { error: 'Story not found or not public' },
        { status: 404 }
      );
    }
    
    // Check if already liked
    const existingLike = await db.collection<StoryLike>('storyLikes').findOne({
      userId: new ObjectId(auth.userId),
      storyId: new ObjectId(storyId)
    });
    
    if (existingLike) {
      return NextResponse.json(
        { error: 'Already liked' },
        { status: 400 }
      );
    }
    
    // Add like
    await db.collection<StoryLike>('storyLikes').insertOne({
      userId: new ObjectId(auth.userId),
      storyId: new ObjectId(storyId),
      likedAt: new Date()
    });
    
    // Increment like count
    await db.collection<SharedStory>('sharedStories').updateOne(
      { storyId: new ObjectId(storyId) },
      { $inc: { likes: 1 } }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Like error:', error);
    return NextResponse.json(
      { error: 'Failed to like story' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const storyId = params.id;
    const db = await getDatabase();
    
    // Remove like
    const result = await db.collection<StoryLike>('storyLikes').deleteOne({
      userId: new ObjectId(auth.userId),
      storyId: new ObjectId(storyId)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Like not found' },
        { status: 404 }
      );
    }
    
    // Decrement like count
    await db.collection<SharedStory>('sharedStories').updateOne(
      { storyId: new ObjectId(storyId) },
      { $inc: { likes: -1 } }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unlike error:', error);
    return NextResponse.json(
      { error: 'Failed to unlike story' },
      { status: 500 }
    );
  }
}