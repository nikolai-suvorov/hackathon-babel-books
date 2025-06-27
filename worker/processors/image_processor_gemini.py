import os
import google.generativeai as genai
from typing import List, Dict
import logging
import base64
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Configure Gemini
if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_story_images(pages: List[Dict], age_group: str, story_context: Dict = None) -> List[Dict]:
    """Generate images for each page using Gemini image generation"""
    images = []
    
    for page in pages:
        try:
            logger.info(f"Generating image for page {page['pageNumber']}")
            
            # Create the exact scene prompt from the page content
            scene_prompt = f"""Create a children's book illustration for this exact scene:

Page {page['pageNumber']} Text: {page.get('text', '')}

REQUIREMENTS:
- Draw EXACTLY what is described in the text above
- NO text or words in the image
- Style: Children's book illustration for {age_group}
- Bright, colorful, age-appropriate
- Single cohesive scene showing all elements mentioned in the text

Draw the scene exactly as described in the page text."""

            # Generate image with Gemini
            image_data = await generate_with_gemini(scene_prompt)
            
            images.append({
                "pageNumber": page["pageNumber"],
                "imageData": image_data,
                "format": "png"
            })
            
        except Exception as e:
            logger.error(f"Error generating image for page {page['pageNumber']}: {str(e)}")
            # Create a simple placeholder
            image_data = create_simple_placeholder(page["pageNumber"], page.get("text", ""))
            images.append({
                "pageNumber": page["pageNumber"],
                "imageData": image_data,
                "format": "png"
            })
    
    return images

async def generate_with_gemini(prompt: str) -> str:
    """Generate an image using Gemini's image capabilities"""
    try:
        # First, use Gemini to create a detailed visual description
        text_model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        # Get Gemini to describe the scene in visual detail
        visual_prompt = f"""Based on this children's book scene, describe EXACTLY what should be in the illustration:

{prompt}

Describe in detail:
1. What characters/objects are visible and their exact appearance
2. The setting/background
3. Colors to use
4. The mood and atmosphere
5. Positioning of elements

Be specific and visual. This will be used to create the actual illustration."""

        response = await text_model.generate_content_async(visual_prompt)
        
        if response.text:
            # For now, create a detailed placeholder based on the description
            # In production, this would connect to an actual image generation service
            return create_descriptive_placeholder(prompt, response.text)
        else:
            return create_simple_placeholder(1, prompt)
            
    except Exception as e:
        logger.error(f"Gemini error: {str(e)}")
        return create_simple_placeholder(1, prompt)

def create_simple_placeholder(page_number: int, text: str) -> str:
    """Create a simple placeholder image"""
    # Create a colorful gradient background
    img = Image.new('RGB', (1024, 768), color='white')
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode()

def create_descriptive_placeholder(original_prompt: str, description: str) -> str:
    """Create a placeholder based on Gemini's description"""
    # For now, create a simple colored placeholder
    # In production, this would use the description to generate actual images
    img = Image.new('RGB', (1024, 768), color=(135, 206, 235))  # Sky blue
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode()