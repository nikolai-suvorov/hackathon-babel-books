import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// Admin emails that can manage essential stories
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['admin@babelbooks.com'];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    // Check if user is admin
    const db = await getDatabase();
    const user = await db.collection('users').findOne({
      _id: new ObjectId(auth.userId)
    });
    
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { storyId, isEssential } = await request.json();
    
    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }
    
    // Update shared story
    await db.collection('sharedStories').updateOne(
      { storyId: new ObjectId(storyId) },
      { $set: { isEssential: isEssential || false } }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Essential story update error:', error);
    return NextResponse.json(
      { error: 'Failed to update essential story' },
      { status: 500 }
    );
  }
}

// Get all essential stories
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    const essentialStories = await db.collection('sharedStories')
      .find({ isEssential: true, isPublic: true })
      .sort({ likes: -1, views: -1 })
      .toArray();
    
    // Get story details
    const storyIds = essentialStories.map(s => s.storyId);
    const stories = await db.collection('stories')
      .find({ _id: { $in: storyIds } })
      .toArray();
    
    // Combine data
    const essential = essentialStories.map(shared => {
      const story = stories.find(s => s._id.toString() === shared.storyId.toString());
      return {
        ...shared,
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
    
    return NextResponse.json({ stories: essential });
  } catch (error) {
    console.error('Essential stories fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch essential stories' },
      { status: 500 }
    );
  }
}