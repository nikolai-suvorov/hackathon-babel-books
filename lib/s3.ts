import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566', // LocalStack endpoint for local dev
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  forcePathStyle: true, // Required for LocalStack
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'babel-books-assets';

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload a base64 encoded file to S3
 */
export async function uploadToS3(
  base64Data: string,
  key: string,
  contentType: string
): Promise<UploadResult> {
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // For production, we'd use CloudFront or direct S3 URLs
  // For local development, we'll use presigned URLs
  const url = await getPresignedUrl(key);

  return { key, url };
}

/**
 * Get a presigned URL for an S3 object
 */
export async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 * 24 * 7 }); // 7 days
  return url;
}

/**
 * Generate a unique key for an asset
 */
export function generateAssetKey(
  storyId: string,
  pageNumber: number,
  assetType: 'image' | 'audio',
  format: string
): string {
  const timestamp = Date.now();
  return `stories/${storyId}/page-${pageNumber}-${assetType}-${timestamp}.${format}`;
}

/**
 * Initialize S3 bucket (for local development)
 */
export async function initializeS3Bucket(): Promise<void> {
  try {
    // In production, the bucket would be created via infrastructure as code
    // For local development with LocalStack, we might need to create it
    console.log(`S3 bucket ${BUCKET_NAME} ready`);
  } catch (error) {
    console.error('Error initializing S3 bucket:', error);
  }
}