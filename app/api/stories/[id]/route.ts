import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const storyId = params.id;
    const db = await getDatabase();
    
    // Verify user owns the story
    const story = await db.collection('stories').findOne({
      _id: new ObjectId(storyId),
      userId: new ObjectId(auth.userId)
    });
    
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete the story
    await db.collection('stories').deleteOne({
      _id: new ObjectId(storyId)
    });
    
    // If story was shared, remove from sharedStories
    if (story.isShared) {
      await db.collection('sharedStories').deleteOne({
        storyId: new ObjectId(storyId)
      });
      
      // Also delete all likes for this story
      await db.collection('storyLikes').deleteMany({
        storyId: new ObjectId(storyId)
      });
    }
    
    // Delete all replays for this story
    await db.collection('storyReplays').deleteMany({
      storyId: new ObjectId(storyId)
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete story error:', error);
    return NextResponse.json(
      { error: 'Failed to delete story' },
      { status: 500 }
    );
  }
}