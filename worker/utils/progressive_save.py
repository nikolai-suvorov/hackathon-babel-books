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
        
        # For large stories, store media in separate collection to avoid 16MB limit
        media_doc = {
            "storyId": story_id,
            "pageNumber": page_data['pageNumber'],
            "createdAt": datetime.utcnow()
        }
        
        # Store image data separately if it exists
        if image_data and image_data.get("imageData"):
            media_doc["imageData"] = image_data["imageData"]
            media_doc["imageFormat"] = image_data.get("format", "png")
            
            # Store reference in page doc
            page_doc["image"] = {
                "hasImage": True,
                "format": image_data.get("format", "png")
            }
            logger.info(f"Storing image for story {story_id} page {page_data['pageNumber']}")
        
        # Store audio data separately if it exists
        if audio_data and audio_data.get("audioData"):
            media_doc["audioData"] = audio_data["audioData"]
            media_doc["audioFormat"] = audio_data.get("format", "mp3")
            media_doc["audioDuration"] = audio_data.get("duration", 0)
            
            # Store reference in page doc
            page_doc["audio"] = {
                "hasAudio": True,
                "format": audio_data.get("format", "mp3"),
                "duration": audio_data.get("duration", 0)
            }
            logger.info(f"Storing audio for story {story_id} page {page_data['pageNumber']}")
        
        # Save media data if we have any
        if "imageData" in media_doc or "audioData" in media_doc:
            await db.story_media.insert_one(media_doc)
        
        # Add page to story document (without embedded media)
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