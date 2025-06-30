import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface FamilyMember {
  _id?: ObjectId;
  familyOwnerId: ObjectId;
  memberId: ObjectId;
  joinedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const db = await getDatabase();
    
    // Check if user is family owner or member
    const userId = new ObjectId(auth.userId);
    
    // First check if user is a family owner
    const membersAsOwner = await db.collection<FamilyMember>('familyMembers')
      .find({ familyOwnerId: userId })
      .toArray();
    
    // Then check if user is a family member
    const membershipAsMember = await db.collection<FamilyMember>('familyMembers')
      .findOne({ memberId: userId });
    
    let familyOwnerId = userId;
    let isOwner = true;
    
    if (membershipAsMember) {
      familyOwnerId = membershipAsMember.familyOwnerId;
      isOwner = false;
    }
    
    // Get all family members
    const allMembers = await db.collection<FamilyMember>('familyMembers')
      .find({ familyOwnerId })
      .toArray();
    
    // Get member details
    const memberIds = [familyOwnerId, ...allMembers.map(m => m.memberId)];
    const users = await db.collection('users')
      .find({ _id: { $in: memberIds } })
      .toArray();
    
    // Format response
    const members = users.map(user => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name || user.email.split('@')[0],
      isOwner: user._id.toString() === familyOwnerId.toString(),
      joinedAt: allMembers.find(m => m.memberId.toString() === user._id.toString())?.joinedAt
    }));
    
    return NextResponse.json({ 
      members,
      isOwner,
      memberCount: members.length
    });
  } catch (error) {
    console.error('Get family members error:', error);
    return NextResponse.json(
      { error: 'Failed to get family members' },
      { status: 500 }
    );
  }
}

// Remove family member
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    const auth = requireAuth(session);
    
    const { memberId } = await request.json();
    
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Only family owner can remove members
    const result = await db.collection<FamilyMember>('familyMembers').deleteOne({
      familyOwnerId: new ObjectId(auth.userId),
      memberId: new ObjectId(memberId)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Member not found or unauthorized' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove family member error:', error);
    return NextResponse.json(
      { error: 'Failed to remove family member' },
      { status: 500 }
    );
  }
}