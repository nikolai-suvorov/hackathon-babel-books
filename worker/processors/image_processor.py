import os
import google.generativeai as genai
from typing import List, Dict
import logging
from .content_filter import make_image_prompt_safe
import base64
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_story_images(pages: List[Dict], age_group: str) -> List[Dict]:
    """Generate images for each page of the story"""
    images = []
    
    for page in pages:
        try:
            # Make the prompt child-safe
            safe_prompt = make_image_prompt_safe(page["imagePrompt"], age_group)
            
            # For now, create placeholder image data
            # In production, this would call Gemini's image generation
            logger.info(f"Generating image for page {page['pageNumber']}: {safe_prompt[:50]}...")
            
            # Create a placeholder image (in production, use actual Gemini API)
            placeholder_image = create_placeholder_image(
                page["pageNumber"], 
                age_group,
                page.get("text", "")[:30]
            )
            
            images.append({
                "pageNumber": page["pageNumber"],
                "prompt": safe_prompt,
                "imageData": placeholder_image,
                "format": "png"
            })
            
        except Exception as e:
            logger.error(f"Error generating image for page {page['pageNumber']}: {str(e)}")
            raise
    
    return images

def create_placeholder_image(page_number: int, age_group: str, text_preview: str) -> str:
    """Create a placeholder image for development"""
    # Create a simple colored image with page number
    img = Image.new('RGB', (1024, 768), color=(135, 206, 235))  # Sky blue
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return img_str

async def check_image_safety(image_data: bytes) -> bool:
    """Check if generated image is appropriate for children"""
    # In production, this would use image recognition to detect:
    # - Violence
    # - Scary content
    # - Inappropriate imagery
    # For now, return True
    return True

async def optimize_image_for_age(image_data: bytes, age_group: str) -> bytes:
    """Optimize image based on age group"""
    # Age-specific optimizations:
    # 0-6 months: High contrast, simple shapes
    # 6-18 months: Bright primary colors
    # 18-36 months: Clear objects, friendly faces
    # 3-4 years: More detail, visual interest
    # 4-5 years: Complex scenes, fine details
    
    # For now, return original data
    return image_data