import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert story
    const result = await db.collection('stories').insertOne(story);
    
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
  } catch (error) {
    console.error('Story creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
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

    return NextResponse.json(story);
  } catch (error) {
    console.error('Story fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}