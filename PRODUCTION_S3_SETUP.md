# Production S3 Setup Guide

## Prerequisites
- AWS Account with S3 access
- IAM user with S3 permissions
- S3 bucket created in your AWS account

## 1. Create S3 Bucket (if not already created)

```bash
aws s3 mb s3://babel-books-assets --region us-east-1
```

## 2. Set Bucket CORS Configuration

Create a file `cors.json`:
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedOrigins": ["https://your-app-domain.com"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3600
        }
    ]
}
```

Apply CORS:
```bash
aws s3api put-bucket-cors --bucket babel-books-assets --cors-configuration file://cors.json
```

## 3. Set Bucket Policy (Public Read Access for Assets)

Create a file `bucket-policy.json`:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::babel-books-assets/*"
        }
    ]
}
```

Apply policy:
```bash
aws s3api put-bucket-policy --bucket babel-books-assets --policy file://bucket-policy.json
```

## 4. Environment Variables for Production

Set these in your production environment (e.g., Render):

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-actual-access-key
AWS_SECRET_ACCESS_KEY=your-actual-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=babel-books-assets
# Do NOT set AWS_ENDPOINT_URL in production
```

## 5. IAM User Permissions

Your IAM user needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::babel-books-assets/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::babel-books-assets"
        }
    ]
}
```

## 6. Troubleshooting

### Check if S3 is working:
1. Check worker logs for S3 upload errors
2. Verify environment variables are set correctly
3. Test S3 access with AWS CLI:
   ```bash
   aws s3 ls s3://babel-books-assets
   ```

### Common Issues:
- **Access Denied**: Check IAM permissions
- **Bucket not found**: Verify bucket name and region
- **CORS errors**: Update CORS configuration with your app domain
- **No credentials**: Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set