import os
import asyncio
from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import logging

from processors import story_generator, image_processor, audio_processor, content_filter
from utils.db import update_story_status, upload_and_save_story

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
db_client = None
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global db_client, db
    db_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    db = db_client["babel-books"]
    logger.info("Connected to MongoDB")
    
    # Start background job processor
    asyncio.create_task(process_jobs())
    logger.info("Started job processor")
    
    yield
    
    # Shutdown
    db_client.close()
    logger.info("Closed MongoDB connection")

app = FastAPI(lifespan=lifespan)

async def process_jobs():
    """Background job processor that polls MongoDB for pending jobs"""
    while True:
        try:
            # Find and claim a pending job
            job = await db.jobs.find_one_and_update(
                {"status": "pending"},
                {"$set": {"status": "processing"}},
                return_document=True
            )
            
            if job:
                logger.info(f"Processing job {job['_id']} for story {job['storyId']}")
                
                try:
                    # 1. Content safety check on prompt
                    is_safe = await content_filter.check_prompt_safety(job["prompt"])
                    if not is_safe:
                        raise ValueError("Prompt contains inappropriate content")
                    
                    # 2. Generate story text
                    await update_story_status(db, job["storyId"], "generating_text")
                    story_data = await story_generator.generate(
                        prompt=job["prompt"],
                        age_group=job["ageGroup"],
                        tone=job["tone"],
                        language=job["language"]
                    )
                    
                    # 3. Generate images for each page
                    await update_story_status(db, job["storyId"], "generating_images")
                    images = await image_processor.generate_story_images(
                        story_data["pages"],
                        age_group=job["ageGroup"]
                    )
                    
                    # 4. Generate narration with background music
                    await update_story_status(db, job["storyId"], "generating_audio")
                    audio_files = await audio_processor.generate_narration(
                        story_data["pages"],
                        language=job.get("narrationLanguage", job["language"]),
                        tone=job["tone"],
                        age_group=job["ageGroup"]
                    )
                    
                    # 5. Upload all assets and save story
                    await upload_and_save_story(
                        db, 
                        job["storyId"], 
                        story_data, 
                        images, 
                        audio_files
                    )
                    
                    # 6. Mark job as completed
                    await db.jobs.update_one(
                        {"_id": job["_id"]},
                        {"$set": {"status": "completed"}}
                    )
                    
                    logger.info(f"Successfully completed job {job['_id']}")
                    
                except Exception as e:
                    logger.error(f"Error processing job {job['_id']}: {str(e)}")
                    await update_story_status(
                        db, 
                        job["storyId"], 
                        "failed", 
                        error=str(e)
                    )
                    await db.jobs.update_one(
                        {"_id": job["_id"]},
                        {"$set": {"status": "failed", "error": str(e)}}
                    )
            
        except Exception as e:
            logger.error(f"Error in job processor: {str(e)}")
        
        # Poll every 2 seconds
        await asyncio.sleep(2)

@app.get("/")
async def root():
    return {
        "service": "babel-books-worker",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        # Check MongoDB connection
        await db_client.admin.command('ping')
        return {
            "status": "healthy",
            "service": "babel-books-worker",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Unhealthy: {str(e)}")

@app.post("/process/{story_id}")
async def trigger_process(story_id: str):
    """Manually trigger processing for a specific story (for testing)"""
    job = await db.jobs.find_one({"storyId": story_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    await db.jobs.update_one(
        {"_id": job["_id"]},
        {"$set": {"status": "pending"}}
    )
    
    return {"message": f"Job for story {story_id} queued for processing"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)