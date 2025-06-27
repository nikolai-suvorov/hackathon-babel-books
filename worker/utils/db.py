from typing import Dict, List, Optional
from datetime import datetime
import logging

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
        
        # Merge page data with images and audio
        for i, page in enumerate(story_data["pages"]):
            page_data = {
                **page,
                "image": images[i] if i < len(images) else None,
                "audio": audio_files[i] if i < len(audio_files) else None
            }
            complete_story["pages"].append(page_data)
        
        # Update story in database
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
        
        logger.info(f"Saved complete story {story_id}")
        return result
        
    except Exception as e:
        logger.error(f"Error saving story {story_id}: {str(e)}")
        raise