"""
Production-ready Gemini image processor with proper error handling and typing.
"""
import base64
import logging
from typing import List, Dict, Optional, Any
from io import BytesIO

from google import genai
from google.genai import types
from PIL import Image

from config import settings

logger = logging.getLogger(__name__)


class ImageGenerationError(Exception):
    """Custom exception for image generation failures."""
    pass


class GeminiImageProcessor:
    """Handles image generation using Google's Imagen model."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the Gemini client."""
        self.api_key = api_key or settings.gemini_api_key
        self.client: Optional[genai.Client] = None

        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            logger.info("Gemini image processor initialized")
        else:
            logger.warning("No Gemini API key provided, image generation will use placeholders")

    def generate_story_images(
            self,
            pages: List[Dict[str, Any]],
            age_group: str,
            story_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate images for story pages with consistent visual style.
        
        Args:
            pages: List of page dictionaries with 'pageNumber' and 'text'
            age_group: Target age group for style selection
            story_context: Optional story metadata for consistency
            
        Returns:
            List of dictionaries with pageNumber, imageData, and format
        """
        if not self.client:
            logger.warning("No Gemini client available, using placeholders")
            return self._generate_placeholder_images(pages)

        story_title = self._extract_story_title(story_context)
        style = self._get_style_for_age_group(age_group)

        try:
            # Generate all images in one request
            generated_images = self._generate_all_images_batch(
                pages, story_title, style, age_group
            )
            
            # Map generated images to pages
            images = []
            for i, page in enumerate(pages):
                if i < len(generated_images):
                    images.append({
                        "pageNumber": page["pageNumber"],
                        "imageData": generated_images[i],
                        "format": "png"
                    })
                else:
                    # Fallback if we didn't get enough images
                    images.append({
                        "pageNumber": page["pageNumber"],
                        "imageData": self._create_placeholder(),
                        "format": "png"
                    })
            
            return images
            
        except Exception as e:
            logger.error(f"Error generating images batch: {str(e)}")
            # Fallback to placeholders for all pages
            return self._generate_placeholder_images(pages)

    def _generate_all_images_batch(
            self,
            pages: List[Dict[str, Any]],
            story_title: str,
            style: str,
            age_group: str
    ) -> List[str]:
        """Generate all images in batches (max 4 images per batch)."""
        if not self.client:
            raise ImageGenerationError("Gemini client not initialized")
        
        # Imagen API supports max 4 images per request
        MAX_IMAGES_PER_BATCH = 4
        generated_images = []
        
        # Create the full story text
        full_story = self._create_full_story_text(pages)
        
        # Process pages in batches
        for batch_start in range(0, len(pages), MAX_IMAGES_PER_BATCH):
            batch_end = min(batch_start + MAX_IMAGES_PER_BATCH, len(pages))
            batch_pages = pages[batch_start:batch_end]
            batch_size = len(batch_pages)
            
            # Create batch-specific story excerpt
            batch_story = "\n\n".join([
                f"Page {page['pageNumber']}: {page.get('text', '')}"
                for page in batch_pages
            ])
            
            # Create a comprehensive prompt for this batch
            prompt = f"""Create {batch_size} distinct illustrations for pages {batch_start + 1} to {batch_end} of a children's story titled "{story_title}".
        
STORY CONTEXT (for consistency):
{full_story[:1000]}...

PAGES TO ILLUSTRATE IN THIS BATCH:
{batch_story}

INSTRUCTIONS:
Generate {batch_size} separate images, one for each page listed above. Each image should:
1. Illustrate the specific events described in its corresponding page
2. Maintain consistent character appearances with any previous illustrations
3. Use the same {style} artistic style
4. Share a cohesive color palette for visual continuity
5. Be bright, colorful, and age-appropriate for {age_group}
6. Contain NO text or words - only visual storytelling

IMPORTANT: Each image must depict different scenes corresponding to the specific page content. Characters should look consistent across all images."""

            logger.info(f"Generating batch {batch_start // MAX_IMAGES_PER_BATCH + 1}: {batch_size} images")
            logger.debug(f"Batch prompt preview: {prompt[:300]}...")

            try:
                response = self.client.models.generate_images(
                    model='imagen-4.0-generate-preview-06-06',
                    prompt=prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=batch_size,
                        safety_filter_level="block_low_and_above",
                        person_generation="allow_adult"
                    )
                )

                if not response.generated_images:
                    logger.warning(f"No images generated for batch starting at page {batch_start + 1}")
                    # Add placeholders for this batch
                    generated_images.extend([self._create_placeholder() for _ in range(batch_size)])
                else:
                    # Extract images from this batch
                    batch_images = []
                    for generated_image in response.generated_images:
                        if hasattr(generated_image, 'image') and hasattr(generated_image.image, 'image_bytes'):
                            image_data = base64.b64encode(generated_image.image.image_bytes).decode()
                            batch_images.append(image_data)
                        else:
                            batch_images.append(self._create_placeholder())
                    
                    # Ensure we have the right number of images
                    while len(batch_images) < batch_size:
                        batch_images.append(self._create_placeholder())
                    
                    generated_images.extend(batch_images[:batch_size])
                    logger.info(f"Successfully generated {len(batch_images)} images in batch")

            except Exception as e:
                logger.error(f"Gemini batch API error for pages {batch_start + 1}-{batch_end}: {str(e)}")
                # Add placeholders for failed batch
                generated_images.extend([self._create_placeholder() for _ in range(batch_size)])
        
        logger.info(f"Total images generated: {len(generated_images)} for {len(pages)} pages")
        return generated_images

    def _create_full_story_text(self, pages: List[Dict[str, Any]]) -> str:
        """Create the full story text with page numbers."""
        story_parts = []
        for page in pages:
            page_num = page.get('pageNumber', 1)
            page_text = page.get('text', '')
            story_parts.append(f"Page {page_num}: {page_text}")
        return "\n\n".join(story_parts)

    async def _generate_page_image(
            self,
            page: Dict[str, Any],
            all_pages: List[Dict[str, Any]],
            story_title: str,
            story_summary: str,
            style: str,
            age_group: str
    ) -> str:
        """Generate a single page image with story context."""
        page_num = page['pageNumber']
        page_text = page.get('text', '')
        total_pages = len(all_pages)

        prompt = self._create_image_prompt(
            page_num, total_pages, story_title, story_summary,
            page_text, style, age_group
        )

        logger.info(f"Generating image for page {page_num}")
        logger.debug(f"Prompt preview: {prompt[:200]}...")

        return await self._generate_with_gemini(prompt, total_pages)

    def _create_image_prompt(
            self,
            page_num: int,
            total_pages: int,
            story_title: str,
            story_summary: str,
            page_text: str,
            style: str,
            age_group: str
    ) -> str:
        """Create a detailed prompt for image generation."""
        return f"""Create a {style} for {page_text} page in the story "{story_title}".
                STORY CONTEXT (for continuity): {story_summary}
                IMPORTANT: Focus on illustrating the events and characters from the CURRENT PAGE above, while maintaining visual consistency with the overall story. The illustration should:
                - Depict the specific scene described in the current page text
                - Maintain consistent character appearances throughout the story
                - Use the same artistic style and color palette across all pages
                - Be a single cohesive scene with no text or words in the image
                - No text or words should be included in the image
                - Be bright, colorful, and age-appropriate for {age_group}"""


    async def _generate_with_gemini(self, prompt: str, total_pages: int) -> str:
        """Generate an image using Gemini's Imagen model."""
        if not self.client:
            raise ImageGenerationError("Gemini client not initialized")

        try:
            response = self.client.models.generate_images(
                model='imagen-4.0-generate-preview-06-06',
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=total_pages,
                    safety_filter_level="block_low_and_above",
                    person_generation="allow_adult"
                )
            )

            if not response.generated_images:
                logger.warning("No images generated by Imagen")
                return self._create_placeholder()

            # Extract image data from response
            for generated_image in response.generated_images:
                if hasattr(generated_image, 'image') and hasattr(generated_image.image, 'image_bytes'):
                    image_data = base64.b64encode(generated_image.image.image_bytes).decode()
                    logger.info("Successfully generated image with Imagen")
                    return image_data

            logger.warning("Could not extract image data from response")
            return self._create_placeholder()

        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise ImageGenerationError(f"Failed to generate image: {str(e)}")

    def _extract_story_title(self, story_context: Optional[Dict[str, Any]]) -> str:
        """Extract story title from context."""
        if story_context and 'title' in story_context:
            return story_context['title']
        return 'A Children\'s Story'

    def _create_story_summary(self, pages: List[Dict[str, Any]]) -> str:
        """Create a brief summary of all pages for context."""
        summary_lines = []
        for page in pages:
            text_preview = page.get('text', '')[:100]
            if text_preview:
                summary_lines.append(f"Page {page['pageNumber']}: {text_preview}...")
        return "\n".join(summary_lines)

    def _get_style_for_age_group(self, age_group: str) -> str:
        """Get appropriate art style for age group."""
        style_map = {
            "0-6 months": "soft watercolor painting with gentle pastel colors",
            "6-18 months": "bright and colorful digital illustration with simple shapes",
            "18-36 months": "vibrant cartoon-style illustration",
            "3-4 years": "detailed children's book illustration with rich colors",
            "4-5 years": "whimsical storybook painting with expressive characters"
        }
        return style_map.get(age_group, "children's book illustration")

    def _generate_placeholder_images(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate placeholder images for all pages."""
        return [
            {
                "pageNumber": page["pageNumber"],
                "imageData": self._create_placeholder(),
                "format": "png"
            }
            for page in pages
        ]

    def _create_placeholder(self) -> str:
        """Create a simple placeholder image."""
        img = Image.new('RGB', (1024, 768), color=(135, 206, 235))  # Sky blue
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode()


# Create a singleton instance for backward compatibility
_processor = None


async def generate_story_images(
        pages: List[Dict[str, Any]],
        age_group: str,
        story_context: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """Legacy function for backward compatibility."""
    global _processor
    if _processor is None:
        _processor = GeminiImageProcessor()
    return _processor.generate_story_images(pages, age_group, story_context)
