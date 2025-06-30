import { POST, GET } from '@/app/api/stories/[id]/rate/route';
import { getSession } from '@/lib/auth';
import { ObjectId } from 'mongodb';

jest.mock('@/lib/auth');

const mockFindOne = jest.fn();
const mockFind = jest.fn().mockReturnValue({
  sort: jest.fn().mockReturnThis(),
  toArray: jest.fn()
});
const mockInsertOne = jest.fn();
const mockUpdateOne = jest.fn();

const mockDb = {
  collection: jest.fn((collectionName) => {
    if (collectionName === 'sharedStories') {
      return { 
        findOne: mockFindOne, 
        updateOne: mockUpdateOne 
      };
    }
    if (collectionName === 'storyRatings') {
      return { 
        findOne: mockFindOne,
        insertOne: mockInsertOne,
        updateOne: mockUpdateOne,
        find: mockFind
      };
    }
    if (collectionName === 'users') {
      return { 
        find: jest.fn().mockReturnValue({
          project: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue([])
        })
      };
    }
    return { findOne: jest.fn() };
  }),
};

jest.mock('@/lib/db', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockDb)),
}));

describe('Story Rating API', () => {
  const mockUserSession = {
    userId: 'user-123',
    email: 'user@example.com'
  };

  const mockStoryId = 'story-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/stories/[id]/rate', () => {
    it('should allow authorized users to rate a shared story', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Mock story exists in marketplace
      mockFindOne
        .mockResolvedValueOnce({ storyId: new ObjectId(mockStoryId) }) // sharedStories
        .mockResolvedValueOnce(null); // no existing rating
      
      // Mock ratings for average calculation
      mockFind().toArray.mockResolvedValue([
        { rating: 5 }
      ]);
      
      mockInsertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
      
      const request = new Request('http://localhost:3000/api/stories/story-123/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, comment: 'Great story!' })
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.averageRating).toBe(5);
      expect(mockInsertOne).toHaveBeenCalled();
    });

    it('should reject unauthenticated users', async () => {
      (getSession as jest.Mock).mockResolvedValue(null);
      
      const request = new Request('http://localhost:3000/api/stories/story-123/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5 })
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('Please login to rate stories');
    });

    it('should reject invalid ratings', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockUserSession);
      
      const request = new Request('http://localhost:3000/api/stories/story-123/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 6 }) // Invalid rating > 5
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toBe('Rating must be between 1 and 5');
    });

    it('should update existing rating', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockUserSession);
      
      const existingRating = {
        _id: new ObjectId(),
        userId: new ObjectId(mockUserSession.userId),
        storyId: new ObjectId(mockStoryId),
        rating: 3
      };
      
      mockFindOne
        .mockResolvedValueOnce({ storyId: new ObjectId(mockStoryId) }) // sharedStories
        .mockResolvedValueOnce(existingRating); // existing rating
      
      mockFind().toArray.mockResolvedValue([
        { rating: 4 }
      ]);
      
      mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
      
      const request = new Request('http://localhost:3000/api/stories/story-123/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 4, comment: 'Updated rating' })
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: existingRating._id },
        expect.objectContaining({
          $set: expect.objectContaining({
            rating: 4,
            comment: 'Updated rating'
          })
        })
      );
    });

    it('should reject rating for non-marketplace stories', async () => {
      (getSession as jest.Mock).mockResolvedValue(mockUserSession);
      
      mockFindOne.mockResolvedValueOnce(null); // story not in marketplace
      
      const request = new Request('http://localhost:3000/api/stories/story-123/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5 })
      });
      
      const response = await POST(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Story not found in marketplace');
    });
  });

  describe('GET /api/stories/[id]/rate', () => {
    it('should return ratings for a story', async () => {
      const ratings = [
        {
          _id: new ObjectId(),
          userId: new ObjectId('user-1'),
          storyId: new ObjectId(mockStoryId),
          rating: 5,
          comment: 'Amazing!',
          ratedAt: new Date()
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId('user-2'),
          storyId: new ObjectId(mockStoryId),
          rating: 4,
          comment: 'Good story',
          ratedAt: new Date()
        }
      ];
      
      mockFind().toArray.mockResolvedValue(ratings);
      
      const request = new Request('http://localhost:3000/api/stories/story-123/rate');
      
      const response = await GET(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.totalRatings).toBe(2);
      expect(data.averageRating).toBe(4.5);
      expect(data.ratings).toHaveLength(2);
    });

    it('should return empty ratings for unrated stories', async () => {
      mockFind().toArray.mockResolvedValue([]);
      
      const request = new Request('http://localhost:3000/api/stories/story-123/rate');
      
      const response = await GET(request, { params: { id: mockStoryId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.totalRatings).toBe(0);
      expect(data.averageRating).toBe(0);
      expect(data.ratings).toHaveLength(0);
    });
  });
});