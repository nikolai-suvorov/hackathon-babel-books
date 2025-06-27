# Fix S3 Permissions for Production

The error shows that the IAM user `books-service` (arn:aws:iam::608164430027:user/books-service) doesn't have permission to upload to S3.

## Quick Fix Steps:

### 1. Add IAM Policy via AWS Console

1. Go to AWS IAM Console: https://console.aws.amazon.com/iam/
2. Click on "Users" in the left sidebar
3. Find and click on the user `books-service`
4. Click "Add permissions" → "Attach existing policies directly"
5. Click "Create policy"
6. Switch to JSON tab and paste this policy:

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

7. Click "Next: Tags" → "Next: Review"
8. Name the policy: `BabelBooksS3Access`
9. Click "Create policy"
10. Go back to the user `books-service` and attach this new policy

### 2. Alternative: Add Inline Policy

If you prefer an inline policy:

1. In the `books-service` user page
2. Click "Add permissions" → "Add inline policy"
3. Use the same JSON as above
4. Name it and create

### 3. Verify It Works

After adding the policy, the worker should be able to upload to S3. The error should disappear and you should see successful uploads in the logs.

## Current Issue Summary:
- ✅ AWS credentials are correctly configured (found in environment)
- ✅ S3 client is connecting to AWS
- ❌ IAM user lacks S3 permissions
- 🔧 Solution: Add the policy above to the `books-service` IAM user