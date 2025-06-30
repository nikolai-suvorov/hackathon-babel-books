import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { UserService } from '@/lib/services/userService';
import { SubscriptionTier } from '@/lib/models/user';
import crypto from 'crypto';

interface FamilyInvitation {
  _id?: ObjectId;
  familyOwnerId: ObjectId;
  inviteCode: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
  usedBy?: ObjectId;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Check if user has family subscription
    const subscription = await UserService.getUserSubscription(auth.userId);
    if (subscription.tier !== SubscriptionTier.FAMILY) {
      return NextResponse.json(
        { error: 'Family subscription required' },
        { status: 403 }
      );
    }
    
    // Check current family members count
    const familyMembers = await db.collection('familyMembers').countDocuments({
      familyOwnerId: new ObjectId(auth.userId)
    });
    
    if (familyMembers >= 3) { // Owner + 3 members = 4 total
      return NextResponse.json(
        { error: 'Family member limit reached' },
        { status: 400 }
      );
    }
    
    // Check if email is already invited or member
    const existingInvite = await db.collection<FamilyInvitation>('familyInvitations').findOne({
      familyOwnerId: new ObjectId(auth.userId),
      email,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    });
    
    if (existingInvite) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 400 }
      );
    }
    
    // Generate invite code
    const inviteCode = crypto.randomBytes(16).toString('hex');
    
    // Create invitation
    await db.collection<FamilyInvitation>('familyInvitations').insertOne({
      familyOwnerId: new ObjectId(auth.userId),
      inviteCode,
      email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    
    // TODO: Send email invitation
    // For now, return the invite code
    
    return NextResponse.json({ 
      success: true,
      inviteCode,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Family invite error:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

// Accept invitation
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const { inviteCode } = await request.json();
    
    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Find valid invitation
    const invitation = await db.collection<FamilyInvitation>('familyInvitations').findOne({
      inviteCode,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }
    
    // Check if user already in a family
    const existingMembership = await db.collection('familyMembers').findOne({
      memberId: new ObjectId(auth.userId)
    });
    
    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already part of a family' },
        { status: 400 }
      );
    }
    
    // Add user to family
    await db.collection('familyMembers').insertOne({
      familyOwnerId: invitation.familyOwnerId,
      memberId: new ObjectId(auth.userId),
      joinedAt: new Date()
    });
    
    // Mark invitation as used
    await db.collection<FamilyInvitation>('familyInvitations').updateOne(
      { _id: invitation._id },
      { 
        $set: { 
          usedAt: new Date(),
          usedBy: new ObjectId(auth.userId)
        }
      }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Successfully joined family'
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}