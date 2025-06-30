"""
Production-ready worker service with progressive story generation.
"""
import asyncio
import logging
import signal
import sys
from contextlib import asynccontextmanager
from typing import Optional

import structlog
from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import settings
from processors import story_generator, image_processor, audio_processor
from utils.db import update_story_status
from utils.progressive_save import (
    save_story_metadata,
    save_page_progressively,
    mark_story_completed
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

# Get logger
logger = structlog.get_logger()

# Global variables
db_client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None
job_processor_task: Optional[asyncio.Task] = None
shutdown_event = asyncio.Event()


async def connect_to_mongodb():
    """Establish MongoDB connection."""
    global db_client, db
    try:
        db_client = AsyncIOMotorClient(settings.mongodb_uri)
        db = db_client[settings.mongodb_database]
        
        # Verify connection
        await db_client.admin.command('ping')
        logger.info("Connected to MongoDB", database=settings.mongodb_database)
    except Exception as e:
        logger.error("Failed to connect to MongoDB", error=str(e))
        raise


async def close_mongodb_connection():
    """Close MongoDB connection."""
    global db_client
    if db_client:
        db_client.close()
        logger.info("Closed MongoDB connection")


async def process_single_job(job: dict) -> None:
    """Process a single job with error handling."""
    job_id = str(job["_id"])
    story_id = job["storyId"]
    
    try:
        logger.info("Processing job", job_id=job_id, story_id=story_id)
        
        # Update job status
        await db.jobs.update_one(
            {"_id": job["_id"]},
            {"$set": {"status": "processing"}}
        )
        
        # Extract story data
        story_data_from_job = job["data"]
        
        # 1. Generate story text
        await update_story_status(db, story_id, "generating_text")
        
        story_data = await story_generator.generate(
            prompt=story_data_from_job["prompt"],
            age_group=story_data_from_job.get("childAge", "3-4 years"),
            tone=story_data_from_job.get("tone", "playful"),
            language=story_data_from_job.get("textLanguage", "English")
        )
        
        # 2. Save story metadata
        await save_story_metadata(db, story_id, story_data)
        
        # 3. Generate all images in batch
        total_pages = len(story_data["pages"])
        logger.info(
            "Generating images in batch",
            story_id=story_id,
            total_pages=total_pages
        )
        
        await update_story_status(
            db, 
            story_id, 
            "generating_images",
            progress={"status": "generating_all_images", "total_pages": total_pages}
        )
        
        # Generate all images at once
        all_images = []
        try:
            all_images = await image_processor.generate_story_images(
                story_data["pages"],
                age_group=story_data_from_job.get("childAge", "3-4 years"),
                story_context=story_data
            )
            logger.info(
                "Batch image generation completed",
                story_id=story_id,
                images_generated=len(all_images)
            )
        except Exception as e:
            logger.error(
                "Batch image generation failed",
                story_id=story_id,
                error=str(e)
            )
            # Create placeholder images for all pages
            all_images = [None] * total_pages
        
        # 4. Process audio and save pages progressively
        await update_story_status(
            db,
            story_id,
            "generating_audio"
        )
        
        for i, page in enumerate(story_data["pages"]):
            page_num = i + 1
            logger.info(
                "Processing page assets",
                story_id=story_id,
                page=page_num,
                total=total_pages
            )
            
            # Update progress
            await update_story_status(
                db, 
                story_id, 
                "generating_assets",
                progress={"current_page": page_num, "total_pages": total_pages}
            )
            
            # Get image data from batch results
            image_data = all_images[i] if i < len(all_images) else None
            
            # Generate audio
            audio_data = None
            try:
                audio_list = await audio_processor.generate_narration(
                    [page],
                    language=story_data_from_job.get(
                        "narrationLanguage",
                        story_data_from_job.get("textLanguage", "English")
                    ),
                    tone=story_data_from_job.get("tone", "playful"),
                    age_group=story_data_from_job.get("childAge", "3-4 years")
                )
                audio_data = audio_list[0] if audio_list else None
            except Exception as e:
                logger.error(
                    "Audio generation failed",
                    story_id=story_id,
                    page=page_num,
                    error=str(e)
                )
            
            # Save page with assets
            await save_page_progressively(
                db,
                story_id,
                page,
                image_data=image_data,
                audio_data=audio_data
            )
            
            # Rate limiting for audio generation
            await asyncio.sleep(settings.page_processing_delay)
        
        # 4. Mark story as completed
        await mark_story_completed(db, story_id)
        
        # 5. Mark job as completed
        await db.jobs.update_one(
            {"_id": job["_id"]},
            {"$set": {"status": "completed"}}
        )
        
        logger.info("Job completed successfully", job_id=job_id)
        
    except Exception as e:
        logger.error(
            "Job processing failed",
            job_id=job_id,
            story_id=story_id,
            error=str(e),
            exc_info=True
        )
        
        # Update story status
        await update_story_status(
            db, 
            story_id, 
            "failed",
            error=str(e)
        )
        
        # Update job status
        await db.jobs.update_one(
            {"_id": job["_id"]},
            {
                "$set": {"status": "failed", "error": str(e)},
                "$inc": {"attempts": 1}
            }
        )


async def process_jobs():
    """Main job processing loop."""
    logger.info("Started job processor")
    
    while not shutdown_event.is_set():
        try:
            # Find and claim a pending job
            job = await db.jobs.find_one_and_update(
                {"status": "pending"},
                {"$set": {"status": "processing"}},
                sort=[("createdAt", 1)]
            )
            
            if job:
                await process_single_job(job)
            else:
                # No jobs available
                await asyncio.sleep(settings.job_check_interval)
                
        except Exception as e:
            logger.error("Job processor error", error=str(e), exc_info=True)
            await asyncio.sleep(settings.job_error_retry_delay)


def handle_shutdown(signum, frame):
    """Handle shutdown signals gracefully."""
    logger.info("Shutdown signal received", signal=signum)
    shutdown_event.set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    global job_processor_task
    
    # Startup
    try:
        # Set up signal handlers
        signal.signal(signal.SIGTERM, handle_shutdown)
        signal.signal(signal.SIGINT, handle_shutdown)
        
        # Connect to MongoDB
        await connect_to_mongodb()
        
        # Start job processor
        job_processor_task = asyncio.create_task(process_jobs())
        
        logger.info("Application startup complete")
        
    except Exception as e:
        logger.error("Failed to start application", error=str(e))
        sys.exit(1)
    
    yield
    
    # Shutdown
    logger.info("Application shutdown initiated")
    
    # Signal job processor to stop
    shutdown_event.set()
    
    # Wait for job processor to finish
    if job_processor_task:
        try:
            await asyncio.wait_for(job_processor_task, timeout=30.0)
        except asyncio.TimeoutError:
            logger.warning("Job processor shutdown timeout")
            job_processor_task.cancel()
    
    # Close database connection
    await close_mongodb_connection()
    
    logger.info("Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="BabelBooks Worker",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "BabelBooks Worker",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        # Check MongoDB connection
        if db is not None:
            await db.command('ping')
        else:
            raise HTTPException(status_code=503, detail="Database not connected")
        
        # Check job processor
        if not job_processor_task or job_processor_task.done():
            raise HTTPException(status_code=503, detail="Job processor not running")
        
        return {
            "status": "healthy",
            "database": "connected",
            "job_processor": "running"
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/metrics")
async def metrics():
    """Basic metrics endpoint."""
    try:
        # Get job counts
        pending_jobs = await db.jobs.count_documents({"status": "pending"})
        processing_jobs = await db.jobs.count_documents({"status": "processing"})
        completed_jobs = await db.jobs.count_documents({"status": "completed"})
        failed_jobs = await db.jobs.count_documents({"status": "failed"})
        
        return {
            "jobs": {
                "pending": pending_jobs,
                "processing": processing_jobs,
                "completed": completed_jobs,
                "failed": failed_jobs
            }
        }
    except Exception as e:
        logger.error("Failed to get metrics", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": settings.log_level,
            "handlers": ["default"],
        },
    }
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_config=log_config
    )