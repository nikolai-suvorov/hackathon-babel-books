from typing import Dict, List, Optional
from datetime import datetime
import logging
from .s3 import upload_asset, generate_asset_key

logger = logging.getLogger(__name__)

async def update_story_status(
    db, 
    story_id: str, 
    status: str, 
    progress: Optional[Dict] = None,
    error: Optional[str] = None
):
    """Update story status in database"""
    update_data = {
        "status": status,
        "updatedAt": datetime.utcnow()
    }
    
    if progress:
        update_data["progress"] = progress
    
    if error:
        update_data["error"] = error
    
    result = await db.stories.update_one(
        {"_id": story_id},
        {"$set": update_data}
    )
    
    logger.info(f"Updated story {story_id} status to {status}")
    return result

async def upload_and_save_story(
    db,
    story_id: str,
    story_data: Dict,
    images: List[Dict],
    audio_files: List[Dict]
):
    """Save complete story with all assets"""
    try:
        # Combine all data
        complete_story = {
            "title": story_data["title"],
            "metadata": story_data["metadata"],
            "pages": []
        }
        
        # Process each page
        for i, page in enumerate(story_data["pages"]):
            page_data = {**page}
            
            # Store image as base64 (S3 disabled for now)
            if i < len(images) and images[i]:
                image_data = images[i]
                if image_data.get("imageData"):
                    page_data["image"] = {
                        "imageData": image_data["imageData"],
                        "format": image_data.get("format", "png")
                    }
                    logger.info(f"Stored image for page {page['pageNumber']}")
            
            # Store audio as base64 (S3 disabled for now)
            if i < len(audio_files) and audio_files[i]:
                audio_data = audio_files[i]
                if audio_data.get("audioData"):
                    page_data["audio"] = {
                        "audioData": audio_data["audioData"],
                        "format": audio_data.get("format", "mp3"),
                        "duration": audio_data.get("duration", 0)
                    }
                    logger.info(f"Stored audio for page {page['pageNumber']}")
            
            complete_story["pages"].append(page_data)
        
        # Update story in database with S3 URLs
        result = await db.stories.update_one(
            {"_id": story_id},
            {
                "$set": {
                    "status": "completed",
                    "story": complete_story,
                    "completedAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Saved complete story {story_id} with S3 assets")
        return result
        
    except Exception as e:
        logger.error(f"Error saving story {story_id}: {str(e)}")
        raise