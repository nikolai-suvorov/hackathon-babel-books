# Deployment Checklist for Render

## Pre-Deployment Checks ✅

- [x] Gemini API integration tested and working
- [x] Story creation flow complete
- [x] Error handling implemented
- [x] Docker compose configuration updated
- [x] Environment variables documented

## Deployment Steps

### 1. Push to GitHub
```bash
git add -A
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Create Services on Render

#### A. Web Service (babel-books-web)
- Runtime: Node
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Instance Type: Free

#### B. Worker Service (babel-books-worker)
- Runtime: Python 3
- Build Command: `cd worker && pip install -r requirements.txt`
- Start Command: `cd worker && python main.py`
- Instance Type: Free

### 3. Environment Variables to Set

#### Both Services Need:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://[username]:[password]@cluster0.wbygnpt.mongodb.net/babel-books?retryWrites=true&w=majority
GEMINI_API_KEY=AIzaSyDIh57faYlMHNcEwbb7rpCIXpCAjXhGjH8
AWS_ACCESS_KEY_ID=AKIAY3GLMYDF6IFHOOFO
AWS_SECRET_ACCESS_KEY=E1SAIDXgidsg+drTJ8XBoMe0+vkHA3AbzLWVq3mb
AWS_REGION=us-east-2
S3_BUCKET_NAME=babel-books-assets
```

#### Web Service Only:
```
NEXT_PUBLIC_APP_URL=https://[your-app-name].onrender.com
NEXTAUTH_URL=https://[your-app-name].onrender.com
NEXTAUTH_SECRET=[generate with: openssl rand -base64 32]
NEXT_PUBLIC_PRODUCT_NAME=BabelBooks
```

#### Worker Service Only:
```
PYTHONUNBUFFERED=1
USE_MOCK_STORIES=false
```

### 4. MongoDB Atlas Configuration
- [ ] Verify database user credentials
- [ ] Add Render IP addresses to whitelist (or allow from anywhere: 0.0.0.0/0)
- [ ] Confirm connection string format

### 5. AWS S3 Configuration
- [ ] Verify S3 bucket exists: babel-books-assets
- [ ] Check bucket region matches AWS_REGION
- [ ] Confirm IAM user has necessary permissions

### 6. Post-Deployment Verification
- [ ] Web service is accessible
- [ ] Can create a new story
- [ ] Worker processes jobs successfully
- [ ] Stories display correctly
- [ ] Images and audio are generated (when implemented)

## Known Issues & Solutions

1. **MongoDB Connection**: If failing, check:
   - Username/password are correct
   - IP whitelist includes Render IPs
   - Connection string format is correct

2. **Gemini API**: If failing, check:
   - API key is valid
   - API is enabled in Google Cloud Console
   - Quotas aren't exceeded

3. **Build Failures**: Common fixes:
   - Ensure all dependencies are in package.json
   - Check Node/Python versions match requirements

## Monitoring

- Check service logs in Render dashboard
- Monitor MongoDB Atlas metrics
- Watch for Gemini API errors
- Track S3 usage

## Rollback Plan

If deployment fails:
1. Previous version remains active on Render
2. Can manually redeploy previous commit
3. All data persists in MongoDB