import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { StoryRating } from '@/lib/models/user';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Please login to rate stories' },
        { status: 401 }
      );
    }

    const storyId = params.id;
    const body = await request.json();
    const { rating, comment } = body;

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if the story is shared in the marketplace
    const sharedStory = await db.collection('sharedStories').findOne({
      storyId: new ObjectId(storyId)
    });

    if (!sharedStory) {
      return NextResponse.json(
        { error: 'Story not found in marketplace' },
        { status: 404 }
      );
    }

    // Check if user already rated this story
    const existingRating = await db.collection<StoryRating>('storyRatings').findOne({
      userId: new ObjectId(session.userId),
      storyId: new ObjectId(storyId)
    });

    if (existingRating) {
      // Update existing rating
      await db.collection<StoryRating>('storyRatings').updateOne(
        { _id: existingRating._id },
        {
          $set: {
            rating,
            comment,
            ratedAt: new Date()
          }
        }
      );
    } else {
      // Create new rating
      await db.collection<StoryRating>('storyRatings').insertOne({
        userId: new ObjectId(session.userId),
        storyId: new ObjectId(storyId),
        rating,
        comment,
        ratedAt: new Date()
      });
    }

    // Update average rating in sharedStories
    const allRatings = await db.collection<StoryRating>('storyRatings')
      .find({ storyId: new ObjectId(storyId) })
      .toArray();

    const averageRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await db.collection('sharedStories').updateOne(
      { storyId: new ObjectId(storyId) },
      {
        $set: {
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          ratingCount: allRatings.length,
          ratings: allRatings
        }
      }
    );

    return NextResponse.json({ 
      success: true,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: allRatings.length
    });
  } catch (error) {
    console.error('Story rating error:', error);
    return NextResponse.json(
      { error: 'Failed to rate story' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storyId = params.id;
    const db = await getDatabase();
    
    // Get all ratings for this story
    const ratings = await db.collection<StoryRating>('storyRatings')
      .find({ storyId: new ObjectId(storyId) })
      .sort({ ratedAt: -1 })
      .toArray();

    // Get user information for each rating
    const userIds = ratings.map(r => r.userId);
    const users = await db.collection('users')
      .find({ _id: { $in: userIds } })
      .project({ name: 1, email: 1 })
      .toArray();

    const ratingsWithUsers = ratings.map(rating => {
      const user = users.find(u => u._id.toString() === rating.userId.toString());
      return {
        ...rating,
        userName: user?.name || user?.email.split('@')[0] || 'Anonymous'
      };
    });

    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    return NextResponse.json({
      ratings: ratingsWithUsers,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    return NextResponse.json(
      { error: 'Failed to get ratings' },
      { status: 500 }
    );
  }
}