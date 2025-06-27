import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDatabase();
    
    // Test connection
    await db.admin().ping();
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'MongoDB connection successful',
      database: db.databaseName
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to connect to MongoDB' },
      { status: 500 }
    );
  }
}