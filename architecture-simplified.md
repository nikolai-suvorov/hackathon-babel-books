# BabelBooks Simplified Architecture for Render.com

## Overview
Single monolithic deployment optimized for Render.com with external managed services.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Users (Web/Mobile)                    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Render.com - Web Service               │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Next.js Full-Stack App                  │   │
│  │                                                  │   │
│  │  Frontend:                                       │   │
│  │  - React Pages                                   │   │
│  │  - Story Creator                                 │   │
│  │  - Story Reader (polls for updates)             │   │
│  │  - User Dashboard                                │   │
│  │                                                  │   │
│  │  API Routes (/api/*):                           │   │
│  │  - /api/auth/*                                  │   │
│  │  - /api/stories/create (initiates job)          │   │
│  │  - /api/stories/[id]/status                     │   │
│  │  - /api/payments/*                              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   MongoDB Atlas                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Collections:                                    │   │
│  │  - users                                         │   │
│  │  - stories (with status field)                   │   │
│  │  - jobs (processing queue)                       │   │
│  │                                                  │   │
│  │  Story Status:                                   │   │
│  │  - pending                                       │   │
│  │  - generating_text                               │   │
│  │  - generating_images                             │   │
│  │  - generating_audio                              │   │
│  │  - completed                                     │   │
│  │  - failed                                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────┐
│           Render.com - Background Worker                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Story Processing Service                 │   │
│  │                                                  │   │
│  │  - Polls MongoDB for pending jobs               │   │
│  │  - Updates story status in real-time            │   │
│  │  - Generates story text (Gemini)                │   │
│  │  - Generates images (Gemini)                    │   │
│  │  - Generates audio (TTS)                        │   │
│  │  - Uploads assets to S3                         │   │
│  │  - Updates story with final data                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Gemini API  │   │   AWS S3      │   │  TTS Service  │
│               │   │               │   │               │
│ - Text Gen    │   │ - Images      │   │ - Narration   │
│ - Image Gen   │   │ - Audio       │   │               │
│               │   │ - Assets      │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Tech Stack

### Deployment on Render.com
- **Web Service**: Next.js 14 (TypeScript/Node.js)
- **Worker Service**: Python FastAPI
- **Deployment**: Two services on Render

### Languages & Frameworks
- **Frontend**: React with TypeScript
- **Web Backend**: Next.js API Routes
- **Worker Backend**: Python 3.11 with FastAPI
- **Processing Libraries**: 
  - Audio: pydub, librosa, gtts
  - Image: Pillow, opencv-python
  - AI: google-generativeai, langchain

### External Services (Already Configured)
- **Database**: MongoDB Atlas
- **AI**: Google Gemini API
- **Payments**: Stripe
- **Storage**: AWS S3
- **CDN**: Render's built-in CDN for static assets

## Simplified Implementation

### 1. Project Structure
```
babel-books/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   ├── create/            # Story creation flow
│   ├── stories/           # Story library & reader
│   ├── auth/              # Auth pages
│   └── api/               # API routes
│       ├── auth/
│       ├── stories/
│       │   ├── create/    # Initiate story generation
│       │   └── [id]/      
│       │       └── status/ # Poll for status
│       └── payments/
├── components/            # React components
├── lib/                   # Shared utilities
│   ├── db.ts             # MongoDB connection
│   ├── gemini.ts         # Gemini API client
│   ├── stripe.ts         # Stripe client
│   └── s3.ts             # S3 client
├── worker/                # Python Background processing
│   ├── main.py           # FastAPI entry point
│   ├── api/              # API endpoints
│   │   └── jobs.py      # Job processing endpoints
│   ├── processors/       # Job processors
│   │   ├── story_generator.py  # Gemini text generation
│   │   ├── image_processor.py  # Image generation & safety
│   │   ├── audio_processor.py  # TTS & audio mixing
│   │   └── content_filter.py   # Content moderation
│   ├── models/           # Data models
│   │   ├── story.py     # Pydantic models
│   │   └── prompts.py   # Age-specific templates
│   ├── utils/            # Utilities
│   │   ├── db.py        # MongoDB connection
│   │   ├── s3.py        # S3 upload
│   │   └── gemini.py    # Gemini client
│   └── requirements.txt  # Python dependencies
├── public/               # Static assets
├── package.json
└── render.yaml          # Render configuration
```

### 2. Environment Variables for Render
```env
# App
NEXT_PUBLIC_APP_URL=https://babel-books.onrender.com
NEXTAUTH_URL=https://babel-books.onrender.com
NEXTAUTH_SECRET=your-secret-here

# MongoDB Atlas
MONGODB_URI=mongodb+srv://...

# Gemini API
GEMINI_API_KEY=your-gemini-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-public

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=babel-books-assets
```

### 3. Deployment Configuration

**render.yaml**:
```yaml
services:
  # Web Service
  - type: web
    name: babel-books-web
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_APP_URL
        value: https://babel-books.onrender.com
      # Add other env vars in Render dashboard

  # Background Worker
  - type: worker
    name: babel-books-worker
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm run worker
    envVars:
      - key: NODE_ENV
        value: production
      # Share same env vars as web service
```

### 4. Key Architecture Features

1. **Background Processing**: Separate worker service for async story generation
2. **Database as Queue**: MongoDB acts as job queue (no separate queue service)
3. **Status Polling**: Frontend polls for story status updates
4. **Built-in Auth**: NextAuth.js instead of separate auth service
5. **Graceful UX**: Users see progress updates while story generates

### 5. Implementation Flow

#### Web Service (Next.js)
```typescript
// app/api/stories/create/route.ts
export async function POST(request: Request) {
  // 1. Validate input
  // 2. Create story document with status: 'pending'
  // 3. Create job document in jobs collection
  // 4. Return story ID immediately
  return { storyId, status: 'pending' }
}

// app/api/stories/[id]/status/route.ts
export async function GET(request: Request, { params }) {
  // Return current story status and progress
  const story = await db.stories.findOne({ _id: params.id })
  return { 
    status: story.status,
    progress: story.progress,
    data: story.status === 'completed' ? story : null
  }
}
```

#### Background Worker Service (Python)
```python
# worker/main.py
from fastapi import FastAPI, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from processors import story_generator, image_processor, audio_processor

app = FastAPI()
db_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
db = db_client["babel-books"]

@app.on_event("startup")
async def startup():
    # Start background job processor
    asyncio.create_task(process_jobs())

async def process_jobs():
    while True:
        # 1. Find and claim pending job
        job = await db.jobs.find_one_and_update(
            {"status": "pending"},
            {"$set": {"status": "processing"}}
        )
        
        if job:
            try:
                # 2. Generate story with age-appropriate prompt
                await update_story_status(job["storyId"], "generating_text")
                story_data = await story_generator.generate(
                    prompt=job["prompt"],
                    age_group=job["ageGroup"],
                    tone=job["tone"],
                    language=job["language"]
                )
                
                # 3. Generate safe images for each page
                await update_story_status(job["storyId"], "generating_images")
                images = await image_processor.generate_story_images(
                    story_data["pages"],
                    age_group=job["ageGroup"]
                )
                
                # 4. Generate narration with background music
                await update_story_status(job["storyId"], "generating_audio")
                audio_files = await audio_processor.generate_narration(
                    story_data["pages"],
                    language=job["narrationLanguage"],
                    tone=job["tone"],
                    age_group=job["ageGroup"]
                )
                
                # 5. Upload all assets and save
                await upload_and_save_story(job["storyId"], story_data, images, audio_files)
                
            except Exception as e:
                await update_story_status(job["storyId"], "failed", error=str(e))
        
        await asyncio.sleep(2)  # Poll every 2 seconds

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "babel-books-worker"}
```

### 6. Deployment Steps

1. **Push to GitHub**
2. **Connect Render to GitHub repo**
3. **Configure environment variables in Render**
4. **Deploy**

### 7. Performance Optimizations for Render

- Use Next.js ISR for static pages
- Implement proper caching headers
- Optimize images with Next.js Image component
- Use MongoDB indexes for fast queries
- Stream responses for large data

### 8. Cost Optimization

- Render free tier for initial development
- MongoDB Atlas free tier (512MB)
- Gemini API pay-per-use
- S3 minimal storage costs
- Stripe only charges on successful payments

This architecture is perfect for MVP and can handle thousands of users on Render's basic plans.