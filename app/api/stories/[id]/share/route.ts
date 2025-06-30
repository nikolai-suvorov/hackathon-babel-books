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
    
    // Remove from sharedStories
    await db.collection('sharedStories').deleteOne({
      storyId: new ObjectId(storyId)
    });
    
    // Update story as not shared
    await db.collection('stories').updateOne(
      { _id: new ObjectId(storyId) },
      { $set: { isShared: false } }
    );
    
    // Delete all likes for this story
    await db.collection('storyLikes').deleteMany({
      storyId: new ObjectId(storyId)
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unshare story error:', error);
    return NextResponse.json(
      { error: 'Failed to unshare story' },
      { status: 500 }
    );
  }
}