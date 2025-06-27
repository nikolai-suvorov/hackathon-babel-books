const { S3Client, CreateBucketCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

async function initializeS3() {
  const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
    forcePathStyle: true,
  });

  const bucketName = 'babel-books-assets';

  try {
    // Create bucket
    await s3Client.send(new CreateBucketCommand({
      Bucket: bucketName,
    }));
    console.log(`✅ Created bucket: ${bucketName}`);
  } catch (error) {
    if (error.name === 'BucketAlreadyOwnedByYou' || error.name === 'BucketAlreadyExists') {
      console.log(`✅ Bucket already exists: ${bucketName}`);
    } else {
      console.error('❌ Error creating bucket:', error);
      throw error;
    }
  }

  // Set CORS configuration
  const corsConfig = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['http://localhost:3000'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      },
    ],
  };

  try {
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig,
    }));
    console.log('✅ Set CORS configuration');
  } catch (error) {
    console.error('❌ Error setting CORS:', error);
  }

  console.log('\n🚀 S3 bucket ready for use!');
}

initializeS3().catch(console.error);