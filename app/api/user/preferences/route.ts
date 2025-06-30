import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface UserPreferences {
  userId: ObjectId;
  name?: string;
  defaultLanguage: string;
  defaultNarrationLanguage: string;
  childProfiles: Array<{
    name: string;
    age: string;
    interests: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const db = await getDatabase();
    
    // Get user data
    const user = await db.collection('users').findOne({
      _id: new ObjectId(auth.userId)
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get user preferences
    const preferences = await db.collection<UserPreferences>('userPreferences').findOne({
      userId: new ObjectId(auth.userId)
    });
    
    return NextResponse.json({
      name: preferences?.name || user.name || '',
      email: user.email,
      defaultLanguage: preferences?.defaultLanguage || 'English',
      defaultNarrationLanguage: preferences?.defaultNarrationLanguage || 'English',
      childProfiles: preferences?.childProfiles || []
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const data = await request.json();
    const db = await getDatabase();
    
    // Validate data
    if (!data.defaultLanguage || !data.defaultNarrationLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Update user preferences
    const preferences: UserPreferences = {
      userId: new ObjectId(auth.userId),
      name: data.name,
      defaultLanguage: data.defaultLanguage,
      defaultNarrationLanguage: data.defaultNarrationLanguage,
      childProfiles: data.childProfiles || []
    };
    
    await db.collection<UserPreferences>('userPreferences').replaceOne(
      { userId: new ObjectId(auth.userId) },
      preferences,
      { upsert: true }
    );
    
    // Also update the user's display name if provided
    if (data.name) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(auth.userId) },
        { $set: { name: data.name } }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}