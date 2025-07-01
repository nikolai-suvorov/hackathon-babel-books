import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { getSession, requireAuth } from '@/lib/auth';
import { StoryShare } from '@/lib/models/user';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const body = await request.json();
    const { userEmail, expiresInDays } = body;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const storyId = new ObjectId(params.id);
    
    // Check if story exists and user owns it
    const story = await db.collection('stories').findOne({
      _id: storyId,
      userId: new ObjectId(auth.userId)
    });
    
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }
    
    // Find the user to share with
    const targetUser = await db.collection('users').findOne({
      email: userEmail.toLowerCase()
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (targetUser._id.toString() === auth.userId) {
      return NextResponse.json(
        { error: 'You cannot share a story with yourself' },
        { status: 400 }
      );
    }
    
    // Check if already shared with this user
    const existingShare = await db.collection<StoryShare>('storyShares').findOne({
      storyId,
      ownerId: new ObjectId(auth.userId),
      sharedWithUserId: targetUser._id
    });
    
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;
    
    if (existingShare) {
      // Update existing share
      await db.collection('storyShares').updateOne(
        { _id: existingShare._id },
        {
          $set: {
            sharedAt: new Date(),
            expiresAt
          }
        }
      );
    } else {
      // Create new share
      const share: StoryShare = {
        storyId,
        ownerId: new ObjectId(auth.userId),
        sharedWithUserId: targetUser._id,
        sharedAt: new Date(),
        expiresAt
      };
      
      await db.collection<StoryShare>('storyShares').insertOne(share);
    }
    
    return NextResponse.json({
      success: true,
      message: `Story shared with ${userEmail}`
    });
  } catch (error) {
    console.error('Private share error:', error);
    return NextResponse.json(
      { error: 'Failed to share story' },
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
    
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const storyId = new ObjectId(params.id);
    
    // Find the user
    const targetUser = await db.collection('users').findOne({
      email: userEmail.toLowerCase()
    });
    
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Delete the share
    const result = await db.collection('storyShares').deleteOne({
      storyId,
      ownerId: new ObjectId(auth.userId),
      sharedWithUserId: targetUser._id
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Story share removed'
    });
  } catch (error) {
    console.error('Remove share error:', error);
    return NextResponse.json(
      { error: 'Failed to remove share' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const db = await getDatabase();
    const storyId = new ObjectId(params.id);
    
    // Get all shares for this story owned by the user
    const shares = await db.collection<StoryShare>('storyShares')
      .find({
        storyId,
        ownerId: new ObjectId(auth.userId)
      })
      .toArray();
    
    // Get user details for each share
    const userIds = shares.map(s => s.sharedWithUserId);
    const users = await db.collection('users')
      .find({ _id: { $in: userIds } })
      .project({ email: 1, name: 1 })
      .toArray();
    
    const sharesWithUsers = shares.map(share => {
      const user = users.find(u => u._id.toString() === share.sharedWithUserId.toString());
      return {
        ...share,
        sharedWithEmail: user?.email,
        sharedWithName: user?.name
      };
    });
    
    return NextResponse.json({
      shares: sharesWithUsers
    });
  } catch (error) {
    console.error('Get shares error:', error);
    return NextResponse.json(
      { error: 'Failed to get shares' },
      { status: 500 }
    );
  }
}