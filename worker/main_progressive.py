import os
import asyncio
from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import logging

from processors import story_generator, image_processor, audio_processor, content_filter
from utils.db import update_story_status
from utils.progressive_save import save_story_metadata, save_page_progressively, mark_story_completed

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
    """Background job processor with progressive page generation"""
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
                    # Get story data from job
                    story_data_from_job = job.get("data", {})
                    
                    # 1. Content safety check on prompt
                    is_safe = await content_filter.check_prompt_safety(story_data_from_job.get("prompt", ""))
                    if not is_safe:
                        raise ValueError("Prompt contains inappropriate content")
                    
                    # 2. Generate story text
                    await update_story_status(db, job["storyId"], "generating_text")
                    story_data = await story_generator.generate(
                        prompt=story_data_from_job.get("prompt", ""),
                        age_group=story_data_from_job.get("childAge", "3-4 years"),
                        tone=story_data_from_job.get("tone", "playful"),
                        language=story_data_from_job.get("textLanguage", "English")
                    )
                    
                    # 3. Save story metadata immediately (so user can start seeing the story)
                    await save_story_metadata(db, job["storyId"], story_data)
                    
                    # 4. Process pages progressively
                    total_pages = len(story_data["pages"])
                    for i, page in enumerate(story_data["pages"]):
                        logger.info(f"Processing page {i+1}/{total_pages} for story {job['storyId']}")
                        
                        # Update status to show which page we're working on
                        await update_story_status(
                            db, 
                            job["storyId"], 
                            "generating_assets",
                            progress={"current_page": i+1, "total_pages": total_pages}
                        )
                        
                        # Generate image for this page
                        try:
                            image_list = await image_processor.generate_story_images(
                                [page],  # Process single page
                                age_group=story_data_from_job.get("childAge", "3-4 years"),
                                story_context=story_data  # Pass full story context
                            )
                            image_data = image_list[0] if image_list else None
                        except Exception as e:
                            logger.error(f"Error generating image for page {i+1}: {str(e)}")
                            image_data = None
                        
                        # Generate audio for this page
                        try:
                            audio_list = await audio_processor.generate_narration(
                                [page],  # Process single page
                                language=story_data_from_job.get("narrationLanguage", story_data_from_job.get("textLanguage", "English")),
                                tone=story_data_from_job.get("tone", "playful"),
                                age_group=story_data_from_job.get("childAge", "3-4 years")
                            )
                            audio_data = audio_list[0] if audio_list else None
                        except Exception as e:
                            logger.error(f"Error generating audio for page {i+1}: {str(e)}")
                            audio_data = None
                        
                        # Save page with assets progressively
                        await save_page_progressively(
                            db,
                            job["storyId"],
                            page,
                            image_data=image_data,
                            audio_data=audio_data
                        )
                        
                        # Small delay to prevent overwhelming the system
                        await asyncio.sleep(0.5)
                    
                    # 5. Mark story as completed
                    await mark_story_completed(db, job["storyId"])
                    
                    # 6. Mark job as completed
                    await db.jobs.update_one(
                        {"_id": job["_id"]},
                        {"$set": {"status": "completed"}}
                    )
                    
                    logger.info(f"Successfully completed job {job['_id']}")
                    
                except Exception as e:
                    logger.error(f"Error processing job {job['_id']}: {str(e)}")
                    
                    # Update story with error
                    await update_story_status(
                        db, 
                        job["storyId"], 
                        "failed",
                        error=str(e)
                    )
                    
                    # Mark job as failed
                    await db.jobs.update_one(
                        {"_id": job["_id"]},
                        {"$set": {"status": "failed", "error": str(e)}}
                    )
            else:
                # No jobs available, wait a bit
                await asyncio.sleep(1)
                
        except Exception as e:
            logger.error(f"Job processor error: {str(e)}")
            await asyncio.sleep(5)

@app.get("/")
async def root():
    return {"status": "Worker running with progressive generation"}

@app.get("/health")
async def health():
    return {"status": "healthy", "mode": "progressive"}