from typing import Dict, List, Optional
from datetime import datetime
import logging
from .s3 import upload_asset, generate_asset_key

logger = logging.getLogger(__name__)

async def save_story_metadata(db, story_id: str, story_data: Dict):
    """Save initial story metadata after text generation"""
    try:
        # Save story title and metadata, with empty pages array
        story_doc = {
            "title": story_data["title"],
            "metadata": story_data["metadata"],
            "pages": [],
            "totalPages": len(story_data["pages"])
        }
        
        # Update story with initial data
        await db.stories.update_one(
            {"_id": story_id},
            {
                "$set": {
                    "status": "generating_assets",
                    "story": story_doc,
                    "textGenerated": True,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Saved story metadata for {story_id}")
        
    except Exception as e:
        logger.error(f"Error saving story metadata: {str(e)}")
        raise

async def save_page_progressively(
    db,
    story_id: str,
    page_data: Dict,
    image_data: Optional[Dict] = None,
    audio_data: Optional[Dict] = None
):
    """Save a single page with its assets progressively"""
    try:
        page_doc = {**page_data}
        
        # Upload image to S3 if present
        if image_data and image_data.get("imageData"):
            # Generate S3 key
            image_key = generate_asset_key(
                story_id=str(story_id),
                page_number=page_data["pageNumber"],
                asset_type="image",
                format=image_data.get("format", "png")
            )
            
            # Upload to S3
            image_url = await upload_asset(
                base64_data=image_data["imageData"],
                key=image_key,
                content_type=f"image/{image_data.get('format', 'png')}",
                metadata={
                    "story_id": str(story_id),
                    "page_number": str(page_data["pageNumber"])
                    # Removed prompt from metadata due to S3 ASCII limitation
                }
            )
            
            # Add S3 URL to page data
            page_doc["image"] = {
                "url": image_url,
                "key": image_key,
                "format": image_data.get("format", "png")
            }
            logger.info(f"Uploaded image for story {story_id} page {page_data['pageNumber']}")
        
        # Upload audio to S3 if present
        if audio_data and audio_data.get("audioData"):
            # Generate S3 key
            audio_key = generate_asset_key(
                story_id=str(story_id),
                page_number=page_data["pageNumber"],
                asset_type="audio",
                format=audio_data.get("format", "mp3")
            )
            
            # Upload to S3
            audio_url = await upload_asset(
                base64_data=audio_data["audioData"],
                key=audio_key,
                content_type=f"audio/{audio_data.get('format', 'mp3')}",
                metadata={
                    "story_id": str(story_id),
                    "page_number": str(page_data["pageNumber"]),
                    "duration": str(audio_data.get("duration", 0))
                }
            )
            
            # Add S3 URL to page data
            page_doc["audio"] = {
                "url": audio_url,
                "key": audio_key,
                "format": audio_data.get("format", "mp3"),
                "duration": audio_data.get("duration", 0)
            }
            logger.info(f"Uploaded audio for story {story_id} page {page_data['pageNumber']}")
        
        # Add page to story document
        await db.stories.update_one(
            {"_id": story_id},
            {
                "$push": {"story.pages": page_doc},
                "$set": {
                    "updatedAt": datetime.utcnow(),
                    f"progress.page{page_data['pageNumber']}": "completed"
                }
            }
        )
        
        logger.info(f"Saved page {page_data['pageNumber']} for story {story_id}")
        
    except Exception as e:
        logger.error(f"Error saving page progressively: {str(e)}")
        raise

async def mark_story_completed(db, story_id: str):
    """Mark story as fully completed"""
    await db.stories.update_one(
        {"_id": story_id},
        {
            "$set": {
                "status": "completed",
                "completedAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
        }
    )
    logger.info(f"Marked story {story_id} as completed")