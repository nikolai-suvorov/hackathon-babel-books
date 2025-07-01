import { NextRequest } from 'next/server';

export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options;

  const urlWithParams = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlWithParams.searchParams.append(key, value);
  });

  return new NextRequest(urlWithParams.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body && { body: JSON.stringify(body) }),
  });
}

export async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export function mockDatabase() {
  const collections: Record<string, any> = {};

  const mockCollection = (name: string) => {
    if (!collections[name]) {
      collections[name] = {
        data: [],
        findOne: jest.fn(),
        find: jest.fn(),
        insertOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        deleteMany: jest.fn(),
        countDocuments: jest.fn(),
        toArray: jest.fn(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };
    }
    return collections[name];
  };

  return {
    collection: jest.fn(mockCollection),
    collections,
    command: jest.fn(),
  };
}