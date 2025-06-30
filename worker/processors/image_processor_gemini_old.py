import os
from google import genai
from google.genai import types
from typing import List, Dict
import logging
import base64
from PIL import Image
from io import BytesIO
import io

logger = logging.getLogger(__name__)

# Create Gemini client
client = None
if os.getenv("GEMINI_API_KEY"):
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_story_images(pages: List[Dict], age_group: str, story_context: Dict = None) -> List[Dict]:
    """Generate images for each page using Gemini"""
    images = []
    
    # Extract story title and create a brief story summary
    story_title = story_context.get('title', 'A Children\'s Story') if story_context else 'A Children\'s Story'
    
    # Create a brief summary of all pages for context
    story_summary = []
    for p in pages:
        story_summary.append(f"Page {p['pageNumber']}: {p.get('text', '')[:100]}...")
    full_story_context = "\n".join(story_summary)
    
    for page in pages:
        try:
            logger.info(f"Generating image for page {page['pageNumber']}")
            
            # Create structured prompt with subject, context, and style
            page_text = page.get('text', '')
            current_page_num = page['pageNumber']
            total_pages = len(pages)
            
            # Build prompt with proper structure
            style_map = {
                "0-6 months": "soft watercolor painting with gentle pastel colors",
                "6-18 months": "bright and colorful digital illustration with simple shapes",
                "18-36 months": "vibrant cartoon-style illustration",
                "3-4 years": "detailed children's book illustration with rich colors",
                "4-5 years": "whimsical storybook painting with expressive characters"
            }
            
            style = style_map.get(age_group, "children's book illustration")
            
            # Create prompt emphasizing subject, context, and style
            scene_prompt = f"""Create a {style} for page {current_page_num} of {total_pages} in the story "{story_title}".

STORY CONTEXT (for continuity):
{full_story_context}

CURRENT PAGE TO ILLUSTRATE (Page {current_page_num}):
{page_text}

IMPORTANT: Focus on illustrating the events and characters from the CURRENT PAGE above, while maintaining visual consistency with the overall story. The illustration should:
- Depict the specific scene described in the current page text
- Maintain consistent character appearances throughout the story
- Use the same artistic style and color palette across all pages
- Be a single cohesive scene with no text or words in the image
- Be bright, colorful, and age-appropriate for {age_group}"""

            # Log the prompt for debugging
            logger.debug(f"Image generation prompt for page {current_page_num}:\n{scene_prompt[:200]}...")

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
            image_data = create_placeholder()
            images.append({
                "pageNumber": page["pageNumber"],
                "imageData": image_data,
                "format": "png"
            })
    
    return images

async def generate_with_gemini(prompt: str) -> str:
    """Generate an image using Gemini's Imagen model"""
    try:
        if not client:
            logger.error("Gemini client not initialized")
            return create_placeholder()
            
        # Use the Imagen model to generate images
        # Note: This is a synchronous call, so we don't await it
        response = client.models.generate_images(
            model='imagen-4.0-generate-preview-06-06',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                # Safety settings for children's content
                safety_filter_level="block_low_and_above",
                person_generation="allow_adult"
            )
        )
        
        # Process the generated images
        logger.info(f"Response type: {type(response)}")
        logger.info(f"Response attributes: {dir(response)}")
        
        if hasattr(response, 'generated_images') and response.generated_images:
            logger.info(f"Found {len(response.generated_images)} images")
            for i, generated_image in enumerate(response.generated_images):
                try:
                    logger.info(f"Processing image {i}: {type(generated_image)}")
                    logger.info(f"Image attributes: {dir(generated_image)}")
                    
                    # Try to get the image data
                    if hasattr(generated_image, 'image'):
                        img = generated_image.image
                        logger.info(f"Found .image attribute, type: {type(img)}")
                        logger.info(f"Image object attributes: {dir(img)}")
                        
                        # Check if it's a google.genai.types.Image
                        if hasattr(img, 'image_bytes'):
                            # Use the image_bytes property
                            image_data = base64.b64encode(img.image_bytes).decode()
                            logger.info("Successfully converted image using image_bytes property")
                            return image_data
                        elif hasattr(img, 'to_bytes'):
                            # Use the to_bytes method
                            image_bytes = img.to_bytes()
                            image_data = base64.b64encode(image_bytes).decode()
                            logger.info("Successfully converted image using to_bytes()")
                            return image_data
                        elif hasattr(img, '_image_bytes'):
                            # Direct access to bytes
                            image_data = base64.b64encode(img._image_bytes).decode()
                            logger.info("Successfully converted image using _image_bytes")
                            return image_data
                        elif hasattr(img, '_pil_image'):
                            # Use the PIL image
                            pil_img = img._pil_image
                            buffer = BytesIO()
                            pil_img.save(buffer, 'PNG')
                            buffer.seek(0)
                            image_data = base64.b64encode(buffer.read()).decode()
                            logger.info("Successfully generated image with _pil_image")
                            return image_data
                    elif hasattr(generated_image, '_image_bytes'):
                        img_bytes = generated_image._image_bytes
                        image_data = base64.b64encode(img_bytes).decode()
                        logger.info("Found ._image_bytes attribute directly")
                        return image_data
                    elif hasattr(generated_image, 'to_json_dict'):
                        # Try to get image data from json representation
                        json_data = generated_image.to_json_dict()
                        logger.info(f"JSON data keys: {json_data.keys() if isinstance(json_data, dict) else 'not a dict'}")
                        if isinstance(json_data, dict) and 'image' in json_data:
                            # The image might be base64 encoded already
                            image_data = json_data['image']
                            logger.info("Successfully extracted base64 image from JSON")
                            return image_data
                        else:
                            logger.error(f"No image data in JSON: {json_data}")
                            continue
                    else:
                        logger.error(f"Unknown image format")
                        continue
                except Exception as e:
                    logger.error(f"Error processing generated image: {str(e)}")
        
        logger.warning("No image generated, using placeholder")
        return create_placeholder()
        
    except Exception as e:
        logger.error(f"Gemini error: {str(e)}")
        return create_placeholder()


def create_placeholder() -> str:
    """Create a minimal placeholder image"""
    # Simple colored background
    img = Image.new('RGB', (1024, 768), color=(135, 206, 235))  # Sky blue
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode()