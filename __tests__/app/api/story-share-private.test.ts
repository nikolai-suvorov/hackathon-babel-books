import { POST, DELETE, GET } from '@/app/api/stories/[id]/share-private/route';
import { getSession, requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

jest.mock('@/lib/auth');

const mockFindOne = jest.fn();
const mockFind = jest.fn().mockReturnValue({
  toArray: jest.fn()
});
const mockInsertOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockDeleteOne = jest.fn();

const mockDb = {
  collection: jest.fn((collectionName) => {
    if (collectionName === 'stories') {
      return { findOne: mockFindOne };
    }
    if (collectionName === 'users') {
      return { 
        findOne: mockFindOne,
        find: jest.fn().mockReturnValue({
          project: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue([])
        })
      };
    }
    if (collectionName === 'storyShares') {
      return { 
        findOne: mockFindOne,
        insertOne: mockInsertOne,
        updateOne: mockUpdateOne,
        deleteOne: mockDeleteOne,
        find: mockFind
      };
    }
    return { findOne: jest.fn() };
  }),
};

jest.mock('@/lib/db', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockDb)),
}));

describe('Private Story Sharing API', () => {
  const mockOwnerSession = {
    userId: 'owner-123',
    email: 'owner@example.com'
  };

  const mockTargetUser = {
    _id: new ObjectId('target-123'),
    email: 'target@example.com',
    name: 'Target User'
  };

  const mockStoryId = 'story-123';
  const mockStory = {
    _id: new ObjectId(mockStoryId),
    userId: new ObjectId(mockOwnerSession.userId),
    title: 'Test Story'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockReturnValue(mockOwnerSession);
  });

  describe('POST /api/stories/[id]/share-private', () => {
    it('should allow story owner to share with another user', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockOwnerSession);
      
      mockFindOne
        .mockResolvedValueOnce(mockStory) // story exists and owned by user
        .mockResolvedValueOnce(mockTargetUser) // target user exists
        .mockResolvedValueOnce(null); // no existing share
      
      mockInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
      
      const request = new Request('http://localhost:3000/api/stories/story-123/share-private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userEmail: 'target@example.com',
          expiresInDays: 7
        })
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Story shared with target@example.com');
      expect(mockInsertOne).toHaveBeenCalled();
    });

    it('should reject if user email is missing', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockOwnerSession);
      
      const request = new Request('http://localhost:3000/api/stories/story-123/share-private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('User email is required');
    });

    it('should reject if story not found or not owned', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockOwnerSession);
      
      mockFindOne.mockResolvedValueOnce(null); // story not found
      
      const request = new Request('http://localhost:3000/api/stories/story-123/share-private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: 'target@example.com' })
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Story not found or access denied');
    });

    it('should reject if target user not found', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockOwnerSession);
      
      mockFindOne
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(null); // target user not found
      
      const request = new Request('http://localhost:3000/api/stories/story-123/share-private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: 'nonexistent@example.com' })
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should reject self-sharing', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockOwnerSession);
      
      const selfUser = {
        _id: new ObjectId(mockOwnerSession.userId),
        email: mockOwnerSession.email
      };
      
      mockFindOne
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(selfUser); // trying to share with self
      
      const request = new Request('http://localhost:3000/api/stories/story-123/share-private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: mockOwnerSession.email })
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('You cannot share a story with yourself');
    });

    it('should update existing share', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockOwnerSession);
      
      const existingShare = {
        _id: new ObjectId(),
        storyId: new ObjectId(mockStoryId),
        ownerId: new ObjectId(mockOwnerSession.userId),
        sharedWithUserId: mockTargetUser._id
      };
      
      mockFindOne
        .mockResolvedValueOnce(mockStory)
        .mockResolvedValueOnce(mockTargetUser)
        .mockResolvedValueOnce(existingShare); // existing share
      
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
      
      const request = new Request('http://localhost:3000/api/stories/story-123/share-private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userEmail: 'target@example.com',
          expiresInDays: 30
        })
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpdateOne).toHaveBeenCalled();
      expect(mockInsertOne).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/stories/[id]/share-private', () => {
    it('should allow owner to remove share', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockOwnerSession);
      
      mockFindOne.mockResolvedValueOnce(mockTargetUser);
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });
      
      const request = new Request('http://localhost:3000/api/stories/story-123/share-private?userEmail=target@example.com', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Story share removed');
    });

    it('should return 404 if share not found', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockOwnerSession);
      
      mockFindOne.mockResolvedValueOnce(mockTargetUser);
      mockDeleteOne.mockResolvedValue({ deletedCount: 0 });
      
      const request = new Request('http://localhost:3000/api/stories/story-123/share-private?userEmail=target@example.com', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Share not found');
    });
  });

  describe('GET /api/stories/[id]/share-private', () => {
    it('should return all shares for a story', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockOwnerSession);
      
      const shares = [
        {
          _id: new ObjectId(),
          storyId: new ObjectId(mockStoryId),
          ownerId: new ObjectId(mockOwnerSession.userId),
          sharedWithUserId: new ObjectId('user-1'),
          sharedAt: new Date()
        },
        {
          _id: new ObjectId(),
          storyId: new ObjectId(mockStoryId),
          ownerId: new ObjectId(mockOwnerSession.userId),
          sharedWithUserId: new ObjectId('user-2'),
          sharedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      ];
      
      mockFind().toArray.mockResolvedValue(shares);
      
      // Setup the users find mock to return matching users
      jest.spyOn(mockDb, 'collection').mockImplementation((collectionName) => {
        if (collectionName === 'storyShares') {
          return { 
            findOne: mockFindOne,
            insertOne: mockInsertOne,
            updateOne: mockUpdateOne,
            deleteOne: mockDeleteOne,
            find: mockFind
          };
        }
        if (collectionName === 'users') {
          const users = [
            { _id: new ObjectId('user-1'), email: 'user1@example.com', name: 'User One' },
            { _id: new ObjectId('user-2'), email: 'user2@example.com', name: 'User Two' }
          ];
          return {
            findOne: mockFindOne,
            find: jest.fn().mockReturnValue({
              project: jest.fn().mockReturnThis(),
              toArray: jest.fn().mockResolvedValue(users)
            })
          };
        }
        return { findOne: jest.fn() };
      });
      
      const request = new Request('http://localhost:3000/api/stories/story-123/share-private');
      
      const response = await GET(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.shares).toHaveLength(2);
      expect(data.shares[0]).toHaveProperty('sharedWithEmail');
      expect(data.shares[0]).toHaveProperty('sharedWithName');
    });
  });
});