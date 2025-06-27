# Deployment Guide for Render

## Prerequisites
- GitHub repository with the code
- Render account (https://render.com)
- MongoDB Atlas cluster (already configured)
- AWS S3 bucket (already configured)
- Gemini API key (already configured)

## Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Add the remote and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/babel-books.git
git push -u origin main
```

## Step 2: Deploy Web Service on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: babel-books-web
   - **Region**: Choose closest to your users
   - **Branch**: main
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (for testing) or Starter ($7/month)

5. Add Environment Variables (click "Advanced" → "Add Environment Variable"):
   ```
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://babel-books-web.onrender.com
   NEXTAUTH_URL=https://babel-books-web.onrender.com
   NEXTAUTH_SECRET=[generate a secure secret]
   MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.wbygnpt.mongodb.net/babel-books?retryWrites=true&w=majority
   GEMINI_API_KEY=
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   AWS_REGION=us-east-2
   S3_BUCKET_NAME=babel-books-assets
   NEXT_PUBLIC_PRODUCT_NAME=BabelBooks
   ```

6. Click "Create Web Service"

## Step 3: Deploy Worker Service on Render

1. Click "New +" → "Background Worker"
2. Connect the same GitHub repository
3. Configure the service:
   - **Name**: babel-books-worker
   - **Region**: Same as web service
   - **Branch**: main
   - **Runtime**: Python 3
   - **Build Command**: `cd worker && pip install -r requirements.txt`
   - **Start Command**: `cd worker && python main.py`
   - **Instance Type**: Free or Starter

4. Add the same environment variables as the web service

5. Click "Create Background Worker"

## Step 4: Configure MongoDB Atlas

**⚠️ Note**: The MongoDB credentials need to be verified. The cluster name appears to be `cluster0.wbygnpt.mongodb.net` based on the mongosh command provided.

1. Go to MongoDB Atlas
2. Verify the database user credentials (username might be 'server' or 'nsuvorovv22')
3. Add Render's IP addresses to the whitelist:
   - For development, you can temporarily allow access from anywhere (0.0.0.0/0)
   - For production, get Render's static IPs (requires paid plan)

## Step 5: Configure S3 Bucket

1. Ensure your S3 bucket has proper CORS configuration:
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST"],
            "AllowedOrigins": ["https://babel-books-web.onrender.com"],
            "ExposeHeaders": []
        }
    ]
}
```

## Step 6: Generate NEXTAUTH_SECRET

Generate a secure secret for NextAuth:
```bash
openssl rand -base64 32
```

Update this in Render's environment variables.

## Step 7: Update URLs

Once deployed, update these URLs:
1. In Render environment variables, update NEXT_PUBLIC_APP_URL and NEXTAUTH_URL to your actual Render URL
2. Update S3 CORS to include your Render domain

## Post-Deployment Checklist

- [ ] Web service is running
- [ ] Worker service is running
- [ ] Can access homepage
- [ ] Can create a story (test with mock data)
- [ ] MongoDB connection works
- [ ] Worker processes jobs (check logs)

## Monitoring

- Check service logs in Render dashboard
- Monitor MongoDB Atlas for connections
- Check AWS S3 for uploaded files

## Troubleshooting

1. **503 Service Unavailable**: Wait for build to complete
2. **MongoDB connection error**: Check IP whitelist
3. **Worker not processing**: Check worker logs
4. **CORS errors**: Update S3 CORS configuration

## Security Notes

⚠️ **Important**: 
- Generate a new NEXTAUTH_SECRET for production
- Consider using Render's environment groups for shared variables
- Enable 2FA on all service accounts
- Regularly rotate API keys