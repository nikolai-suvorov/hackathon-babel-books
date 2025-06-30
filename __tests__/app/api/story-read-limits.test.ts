import { GET } from '@/app/api/stories/route';
import { UserService } from '@/lib/services/userService';
import { getSession } from '@/lib/auth';
import { SubscriptionTier } from '@/lib/models/user';

jest.mock('@/lib/auth');
jest.mock('@/lib/services/userService');
const mockFindOne = jest.fn();
const mockFind = jest.fn().mockReturnValue({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  toArray: jest.fn()
});
const mockStorySharesFindOne = jest.fn();

const mockDb = {
  collection: jest.fn((collectionName) => {
    if (collectionName === 'stories') {
      return { findOne: mockFindOne, find: mockFind };
    }
    if (collectionName === 'storyShares') {
      return { findOne: mockStorySharesFindOne };
    }
    return { findOne: jest.fn(), find: mockFind };
  }),
};

jest.mock('@/lib/db', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockDb)),
}));

describe('Story Read Limits for Free Users', () => {
  const mockFreeUserSession = {
    userId: 'free-user-123',
    email: 'free@example.com'
  };

  const mockPaidUserSession = {
    userId: 'paid-user-123',
    email: 'paid@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorySharesFindOne.mockResolvedValue(null);
  });

  it('should allow free user to read a story for the first time', async () => {
    (getSession as jest.Mock).mockResolvedValue(mockFreeUserSession);
    (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

    
    mockFindOne.mockResolvedValue({
      _id: 'story123',
      title: 'Test Story',
      userId: 'another-user',
      isShared: true
    });

    const request = new Request('http://localhost:3000/api/stories?id=story123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Test Story');
    expect(UserService.trackStoryReplay).toHaveBeenCalledWith(
      mockFreeUserSession.userId,
      'story123'
    );
  });

  it('should allow free user to read a story for the second time', async () => {
    (getSession as jest.Mock).mockResolvedValue(mockFreeUserSession);
    (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

    
    mockFindOne.mockResolvedValue({
      _id: 'story123',
      title: 'Test Story',
      userId: 'another-user',
      isShared: true
    });

    const request = new Request('http://localhost:3000/api/stories?id=story123');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(UserService.trackStoryReplay).toHaveBeenCalledWith(
      mockFreeUserSession.userId,
      'story123'
    );
  });

  it('should block free user from reading a story for the third time', async () => {
    (getSession as jest.Mock).mockResolvedValue(mockFreeUserSession);
    (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(false);

    
    mockFindOne.mockResolvedValue({
      _id: 'story123',
      title: 'Test Story',
      userId: 'another-user',
      isShared: true
    });

    const request = new Request('http://localhost:3000/api/stories?id=story123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Replay limit reached. Please upgrade your subscription.');
    expect(UserService.trackStoryReplay).toHaveBeenCalledWith(
      mockFreeUserSession.userId,
      'story123'
    );
  });

  it('should allow unlimited reads for paid users', async () => {
    (getSession as jest.Mock).mockResolvedValue(mockPaidUserSession);
    (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

    
    mockFindOne.mockResolvedValue({
      _id: 'story123',
      title: 'Test Story',
      userId: 'another-user',
      isShared: true
    });

    const request = new Request('http://localhost:3000/api/stories?id=story123');
    
    // Simulate multiple reads
    for (let i = 0; i < 5; i++) {
      const response = await GET(request);
      expect(response.status).toBe(200);
    }

    expect(UserService.trackStoryReplay).toHaveBeenCalledTimes(5);
  });

  it('should not track replays for story owners', async () => {
    const ownerSession = {
      userId: 'owner-123',
      email: 'owner@example.com'
    };
    
    (getSession as jest.Mock).mockResolvedValue(ownerSession);

    
    mockFindOne.mockResolvedValue({
      _id: 'story123',
      title: 'My Story',
      userId: { toString: () => 'owner-123' },
      isShared: true
    });

    const request = new Request('http://localhost:3000/api/stories?id=story123');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(UserService.trackStoryReplay).not.toHaveBeenCalled();
  });

  it('should track privately shared story reads', async () => {
    (getSession as jest.Mock).mockResolvedValue(mockFreeUserSession);
    (UserService.trackStoryReplay as jest.Mock).mockResolvedValue(true);

    
    mockFindOne.mockResolvedValue({
      _id: 'story123',
      title: 'Private Story',
      userId: { toString: () => 'another-user' },
      isShared: false // Not publicly shared
    });

    // Mock private share exists
    mockStorySharesFindOne.mockResolvedValue({
      storyId: { toString: () => 'story123' },
      sharedWithUserId: { toString: () => mockFreeUserSession.userId }
    });

    const request = new Request('http://localhost:3000/api/stories?id=story123');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(UserService.trackStoryReplay).toHaveBeenCalledWith(
      mockFreeUserSession.userId,
      'story123'
    );
  });
});