import os
import google.generativeai as genai
from typing import List, Dict
import logging
from .content_filter import make_image_prompt_safe
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import aiohttp
import json
import math
import random

logger = logging.getLogger(__name__)

# Configure Gemini only if not using mock
if os.getenv("USE_MOCK_STORIES") != "true":
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_story_images(pages: List[Dict], age_group: str) -> List[Dict]:
    """Generate images for each page of the story"""
    images = []
    
    # Check if we should use mock images
    use_mock = os.getenv("USE_MOCK_STORIES") == "true" or os.getenv("USE_MOCK_IMAGES") == "true"
    
    for page in pages:
        try:
            # Make the prompt child-safe
            safe_prompt = make_image_prompt_safe(page["imagePrompt"], age_group)
            
            # Add style guide for children's book illustrations
            styled_prompt = f"{safe_prompt}. Style: {get_age_appropriate_style(age_group)}"
            
            logger.info(f"Generating image for page {page['pageNumber']}: {safe_prompt[:50]}...")
            
            if use_mock:
                # Use placeholder for development/testing
                image_data = create_placeholder_image(
                    page["pageNumber"], 
                    age_group,
                    page.get("text", "")[:30]
                )
            else:
                # Try to use Gemini's image generation
                try:
                    image_data = await generate_with_gemini(styled_prompt, age_group)
                except Exception as e:
                    logger.warning(f"Gemini image generation failed, using placeholder: {str(e)}")
                    image_data = create_placeholder_image(
                        page["pageNumber"], 
                        age_group,
                        page.get("text", "")[:30]
                    )
            
            images.append({
                "pageNumber": page["pageNumber"],
                "prompt": safe_prompt,
                "imageData": image_data,
                "format": "png"
            })
            
        except Exception as e:
            logger.error(f"Error generating image for page {page['pageNumber']}: {str(e)}")
            raise
    
    return images


def extract_visual_elements(description: str, prompt: str) -> Dict:
    """Extract visual elements from the description"""
    desc_lower = (description + " " + prompt).lower()
    elements = {
        "main_character": None,
        "environment": [],
        "objects": []
    }
    
    # Common characters
    characters = {
        "butterfly": {"shape": "butterfly", "color": (255, 180, 100)},
        "starfish": {"shape": "star", "color": (255, 150, 100)},
        "bird": {"shape": "bird", "color": (100, 150, 255)},
        "fish": {"shape": "fish", "color": (100, 200, 255)},
        "rabbit": {"shape": "rabbit", "color": (255, 255, 255)},
        "bear": {"shape": "bear", "color": (165, 42, 42)},
        "cat": {"shape": "cat", "color": (200, 200, 200)},
        "dog": {"shape": "dog", "color": (139, 69, 19)},
        "dragon": {"shape": "dragon", "color": (100, 255, 100)},
        "unicorn": {"shape": "unicorn", "color": (255, 200, 255)},
        "dinosaur": {"shape": "dinosaur", "color": (100, 200, 100)},
        "monster": {"shape": "monster", "color": (150, 100, 200)}
    }
    
    # Find main character
    for char, info in characters.items():
        if char in desc_lower:
            elements["main_character"] = info
            break
    
    # Environmental elements
    if any(word in desc_lower for word in ["ocean", "sea", "water", "reef", "underwater"]):
        elements["environment"].append("ocean")
    if any(word in desc_lower for word in ["forest", "trees", "jungle", "woods"]):
        elements["environment"].append("forest")
    if any(word in desc_lower for word in ["sky", "clouds", "flying"]):
        elements["environment"].append("sky")
    if any(word in desc_lower for word in ["moon", "night", "stars"]):
        elements["environment"].append("night")
    if any(word in desc_lower for word in ["sun", "sunny", "bright"]):
        elements["environment"].append("sun")
    
    # Objects
    object_keywords = {
        "rainbow": "rainbow",
        "flower": "flower",
        "star": "star",
        "heart": "heart",
        "balloon": "balloon",
        "book": "book",
        "paintbrush": "paintbrush",
        "music": "music_note",
        "house": "house",
        "tree": "tree"
    }
    
    for keyword, obj_type in object_keywords.items():
        if keyword in desc_lower:
            elements["objects"].append(obj_type)
    
    return elements


def draw_character(draw, character_info: Dict, description: str):
    """Draw a character based on its type"""
    import random
    
    # Position character prominently
    x = random.randint(300, 700)
    y = random.randint(200, 400)
    
    shape = character_info["shape"]
    color = character_info["color"]
    
    if shape == "butterfly":
        # Draw butterfly shape
        # Wings
        draw.ellipse([x-60, y-40, x-20, y+40], fill=color)
        draw.ellipse([x+20, y-40, x+60, y+40], fill=color)
        # Body
        draw.ellipse([x-10, y-50, x+10, y+50], fill=(100, 50, 0))
        # Decorations
        draw.ellipse([x-45, y-20, x-35, y-10], fill=(255, 255, 255))
        draw.ellipse([x+35, y-20, x+45, y-10], fill=(255, 255, 255))
    
    elif shape == "star":
        # Draw starfish
        points = []
        for i in range(5):
            angle = i * 72 - 90
            r_outer = 80
            r_inner = 40
            # Outer point
            px = x + r_outer * math.cos(math.radians(angle))
            py = y + r_outer * math.sin(math.radians(angle))
            points.append((px, py))
            # Inner point
            angle_inner = angle + 36
            px = x + r_inner * math.cos(math.radians(angle_inner))
            py = y + r_inner * math.sin(math.radians(angle_inner))
            points.append((px, py))
        draw.polygon(points, fill=color)
        # Face
        draw.ellipse([x-10, y-10, x+10, y+10], fill=(255, 255, 255))
        draw.ellipse([x-5, y-5, x+5, y+5], fill=(0, 0, 0))
    
    elif shape == "fish":
        # Draw fish shape
        # Body
        draw.ellipse([x-50, y-30, x+30, y+30], fill=color)
        # Tail
        points = [(x+20, y), (x+60, y-20), (x+60, y+20)]
        draw.polygon(points, fill=color)
        # Eye
        draw.ellipse([x-30, y-10, x-20, y], fill=(255, 255, 255))
        draw.ellipse([x-27, y-7, x-23, y-3], fill=(0, 0, 0))
    
    else:
        # Generic character circle with face
        draw.ellipse([x-50, y-50, x+50, y+50], fill=color)
        # Eyes
        draw.ellipse([x-20, y-20, x-10, y-10], fill=(255, 255, 255))
        draw.ellipse([x+10, y-20, x+20, y-10], fill=(255, 255, 255))
        draw.ellipse([x-17, y-17, x-13, y-13], fill=(0, 0, 0))
        draw.ellipse([x+13, y-17, x+17, y-13], fill=(0, 0, 0))
        # Smile
        draw.arc([x-20, y, x+20, y+30], start=0, end=180, fill=(0, 0, 0), width=3)


def draw_environment(draw, environments: List[str], description: str):
    """Draw environmental elements"""
    for env in environments:
        if env == "ocean":
            # Draw waves at bottom
            wave_color = (70, 130, 180)
            for i in range(3):
                y = 500 + i * 50
                points = []
                for x in range(0, 1025, 50):
                    wave_y = y + 20 * math.sin(x / 50 + i)
                    points.append((x, wave_y))
                points.extend([(1024, 768), (0, 768)])
                draw.polygon(points, fill=wave_color)
        
        elif env == "night":
            # Draw moon
            draw.ellipse([850, 50, 950, 150], fill=(255, 255, 200))
            # Stars
            for _ in range(20):
                x = random.randint(0, 1024)
                y = random.randint(0, 300)
                draw.ellipse([x-2, y-2, x+2, y+2], fill=(255, 255, 255))
        
        elif env == "sun":
            # Draw sun
            draw.ellipse([100, 50, 200, 150], fill=(255, 255, 0))
            # Sun rays
            for angle in range(0, 360, 30):
                x1 = 150 + 50 * math.cos(math.radians(angle))
                y1 = 100 + 50 * math.sin(math.radians(angle))
                x2 = 150 + 80 * math.cos(math.radians(angle))
                y2 = 100 + 80 * math.sin(math.radians(angle))
                draw.line([(x1, y1), (x2, y2)], fill=(255, 255, 0), width=3)
        
        elif env == "forest":
            # Draw trees
            for i in range(5):
                x = 100 + i * 200
                # Trunk
                draw.rectangle([x-20, 400, x+20, 500], fill=(139, 69, 19))
                # Leaves
                draw.ellipse([x-60, 300, x+60, 420], fill=(34, 139, 34))


def draw_object(draw, obj_type: str, description: str):
    """Draw specific objects"""
    import random
    
    if obj_type == "rainbow":
        # Draw rainbow arc
        rainbow_colors = [
            (255, 0, 0), (255, 127, 0), (255, 255, 0),
            (0, 255, 0), (0, 0, 255), (75, 0, 130), (148, 0, 211)
        ]
        for i, color in enumerate(rainbow_colors):
            draw.arc([200 + i*10, 100 + i*10, 800 - i*10, 400 - i*10], 
                    start=180, end=360, fill=color, width=10)
    
    elif obj_type == "flower":
        # Draw flowers
        for _ in range(3):
            x = random.randint(100, 900)
            y = random.randint(400, 600)
            # Petals
            for angle in range(0, 360, 60):
                px = x + 20 * math.cos(math.radians(angle))
                py = y + 20 * math.sin(math.radians(angle))
                draw.ellipse([px-15, py-15, px+15, py+15], fill=(255, 182, 193))
            # Center
            draw.ellipse([x-10, y-10, x+10, y+10], fill=(255, 255, 0))
    
    elif obj_type == "star":
        # Draw twinkling stars
        for _ in range(10):
            x = random.randint(50, 974)
            y = random.randint(50, 400)
            points = []
            for i in range(8):
                angle = i * 45
                r = 15 if i % 2 == 0 else 7
                px = x + r * math.cos(math.radians(angle))
                py = y + r * math.sin(math.radians(angle))
                points.append((px, py))
            draw.polygon(points, fill=(255, 255, 100))

async def generate_with_gemini(prompt: str, age_group: str) -> str:
    """Generate an image using Gemini's capabilities"""
    try:
        # Use Gemini to create a detailed scene description
        text_model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Create a detailed prompt for scene description
        scene_prompt = f"""Describe a children's book illustration scene in vivid detail:
        
        Scene: {prompt}
        Age group: {age_group}
        
        Provide specific details about:
        1. Main character appearance and colors
        2. Background setting and environment
        3. Key objects and their positions
        4. Color palette (specific colors)
        5. Mood and atmosphere
        
        Keep it child-friendly, bright, and engaging."""
        
        logger.info(f"Getting scene description from Gemini...")
        
        try:
            # Get detailed scene description
            response = await text_model.generate_content_async(scene_prompt)
            
            if response.text:
                logger.info("Creating enhanced visual from Gemini description")
                # Create a rich placeholder based on the description
                return create_rich_placeholder(prompt, response.text, age_group)
            else:
                raise ValueError("No scene description generated")
            
        except Exception as desc_error:
            logger.warning(f"Scene description failed: {str(desc_error)}, using basic placeholder")
            # Fall back to basic enhanced placeholder
            return create_enhanced_placeholder(prompt, age_group)
            
    except Exception as e:
        logger.error(f"Gemini integration error: {str(e)}")
        raise

def create_rich_placeholder(prompt: str, description: str, age_group: str) -> str:
    """Create a rich placeholder image based on Gemini's description"""
    import random
    
    # Parse colors from description with more variety
    colors = {
        "red": (255, 100, 100),
        "blue": (100, 150, 255),
        "green": (100, 255, 100),
        "yellow": (255, 255, 100),
        "purple": (200, 100, 255),
        "orange": (255, 180, 100),
        "pink": (255, 182, 193),
        "sky": (135, 206, 235),
        "ocean": (70, 130, 180),
        "forest": (34, 139, 34),
        "sunset": (255, 140, 90),
        "night": (25, 25, 112),
        "dark": (40, 40, 80),
        "bright": (255, 250, 200),
        "coral": (255, 127, 80),
        "turquoise": (64, 224, 208),
        "lavender": (230, 230, 250),
        "golden": (255, 215, 0)
    }
    
    # Determine background based on scene context
    desc_lower = description.lower()
    prompt_lower = prompt.lower()
    
    # Scene-specific backgrounds
    if any(word in desc_lower for word in ["underwater", "ocean", "sea", "reef"]):
        bg_color = colors["ocean"]
    elif any(word in desc_lower for word in ["night", "moon", "stars", "evening"]):
        bg_color = colors["night"]
    elif any(word in desc_lower for word in ["sunset", "dusk", "twilight"]):
        bg_color = colors["sunset"]
    elif any(word in desc_lower for word in ["forest", "jungle", "trees"]):
        bg_color = colors["forest"]
    else:
        # Look for color mentions
        bg_color = (135, 206, 235)  # Default sky blue
        for color_name, color_value in colors.items():
            if color_name in desc_lower:
                bg_color = color_value
                break
    
    # Create image with gradient background
    img = Image.new('RGB', (1024, 768), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Add gradient effect
    for y in range(768):
        gradient_factor = y / 768
        r = int(bg_color[0] * (1 - gradient_factor * 0.3))
        g = int(bg_color[1] * (1 - gradient_factor * 0.3))
        b = int(bg_color[2] * (1 - gradient_factor * 0.3))
        draw.line([(0, y), (1024, y)], fill=(r, g, b))
    
    # Extract key elements from description
    elements = extract_visual_elements(description, prompt)
    
    # Draw main character/object
    if elements.get("main_character"):
        draw_character(draw, elements["main_character"], desc_lower)
    
    # Add environmental elements
    if elements.get("environment"):
        draw_environment(draw, elements["environment"], desc_lower)
    
    # Add specific objects mentioned
    for obj in elements.get("objects", []):
        draw_object(draw, obj, desc_lower)
    
    # Add story title/prompt
    try:
        font = ImageFont.load_default()
        # Title background
        draw.rectangle([50, 650, 974, 718], fill=(255, 255, 255, 180))
        draw.text((512, 684), prompt[:80] + "...", anchor="mm", fill=(50, 50, 50), font=font)
    except:
        pass
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode()

def create_enhanced_placeholder(prompt: str, age_group: str) -> str:
    """Create an enhanced placeholder based on the prompt"""
    # Create different colored placeholders based on content
    colors = {
        "0-6 months": (255, 255, 255),  # White (high contrast)
        "6-18 months": (255, 255, 0),    # Yellow (bright)
        "18-36 months": (135, 206, 235), # Sky blue
        "3-4 years": (255, 182, 193),    # Pink
        "4-5 years": (144, 238, 144)     # Light green
    }
    
    color = colors.get(age_group, (200, 200, 200))
    img = Image.new('RGB', (1024, 768), color=color)
    
    # Add some visual interest
    draw = ImageDraw.Draw(img)
    
    # Draw some shapes for visual interest
    for i in range(5):
        x = 100 + i * 150
        y = 300
        shape_color = tuple(max(0, c - 30) for c in color)
        draw.ellipse([x, y, x + 100, y + 100], fill=shape_color)
    
    # Add text
    try:
        font = ImageFont.load_default()
        text_color = (100, 100, 100)
        draw.text((512, 384), "Story Image", anchor="mm", fill=text_color, font=font)
        draw.text((512, 420), f"Age: {age_group}", anchor="mm", fill=text_color, font=font)
    except:
        pass
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode()

def extract_image_from_response(response) -> str:
    """Extract base64 image data from Gemini response"""
    # This is experimental - the actual format depends on the model
    # For now, return a placeholder as we test the integration
    logger.info("Image generation response received, extracting data...")
    
    # Create a colorful test image to indicate successful API call
    img = Image.new('RGB', (1024, 768), color=(255, 182, 193))  # Light pink
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode()

def get_age_appropriate_style(age_group: str) -> str:
    """Get art style appropriate for age group"""
    styles = {
        "0-6 months": "simple shapes, high contrast black and white, bold patterns",
        "6-18 months": "bright primary colors, simple objects, friendly faces",
        "18-36 months": "colorful cartoon style, recognizable objects, happy expressions",
        "3-4 years": "playful illustrations, vibrant colors, engaging characters",
        "4-5 years": "detailed illustrations, rich colors, expressive characters"
    }
    return styles.get(age_group, "child-friendly cartoon illustration")

def create_placeholder_image(page_number: int, age_group: str, text_preview: str) -> str:
    """Create a placeholder image for development"""
    # Create a simple colored image with page number
    img = Image.new('RGB', (1024, 768), color=(135, 206, 235))  # Sky blue
    
    # Add page number and text preview
    draw = ImageDraw.Draw(img)
    
    # Draw a large page number
    try:
        font = ImageFont.load_default()
        draw.text((512, 300), f"Page {page_number}", anchor="mm", fill=(255, 255, 255), font=font)
        draw.text((512, 350), text_preview[:50] + "...", anchor="mm", fill=(255, 255, 255), font=font)
    except:
        pass
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_str = base64.b64encode(buffer.read()).decode()
    
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