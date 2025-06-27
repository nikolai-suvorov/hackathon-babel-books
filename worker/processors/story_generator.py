import os
import google.generativeai as genai
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)

# Configure Gemini only if not using mock
if os.getenv("USE_MOCK_STORIES") != "true":
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Age-specific story parameters
AGE_CONFIGS = {
    "0-6 months": {
        "pages": 4,
        "words_per_page": 10,
        "style": "single objects, high contrast, simple shapes",
        "complexity": "very simple, repetitive"
    },
    "6-18 months": {
        "pages": 6,
        "words_per_page": 20,
        "style": "familiar objects, bright colors, simple actions",
        "complexity": "simple cause and effect"
    },
    "18-36 months": {
        "pages": 8,
        "words_per_page": 40,
        "style": "characters with emotions, everyday scenes",
        "complexity": "mini adventures, simple problems"
    },
    "3-4 years": {
        "pages": 10,
        "words_per_page": 60,
        "style": "imaginative scenes, visual humor",
        "complexity": "rhythm and repetition, simple lessons"
    },
    "4-5 years": {
        "pages": 12,
        "words_per_page": 80,
        "style": "detailed scenes, character interactions",
        "complexity": "complete story arc, emotional depth"
    }
}

async def generate(prompt: str, age_group: str, tone: str, language: str) -> Dict:
    """Generate a story based on the given parameters"""
    
    config = AGE_CONFIGS.get(age_group, AGE_CONFIGS["3-4 years"])
    
    # Check if we're using a mock API key or if Gemini is unavailable
    if os.getenv("GEMINI_API_KEY") == "mock-api-key" or os.getenv("USE_MOCK_STORIES") == "true":
        return await generate_mock_story(prompt, age_group, tone, language, config)
    
    # Build the system prompt
    system_prompt = f"""You are a creative children's book author specializing in stories for {age_group} year olds.
    
Create a {tone.lower()} story in {language} based on this prompt: "{prompt}"

Requirements:
- Exactly {config['pages']} pages
- About {config['words_per_page']} words per page
- Style: {config['style']}
- Complexity: {config['complexity']}
- Include interactive elements appropriate for the age
- Safe, educational, and engaging content

Format your response as JSON:
{{
    "title": "Story Title",
    "pages": [
        {{
            "pageNumber": 1,
            "text": "Page text here",
            "imagePrompt": "Detailed description for illustration",
            "interactiveElement": "Optional: tap the sun to make it shine!",
            "narratorNote": "Optional: read with excitement"
        }}
    ]
}}"""

    try:
        # Generate with Gemini
        model = genai.GenerativeModel(
            'gemini-1.5-flash-latest',
            safety_settings={
                'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
                'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
                'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
                'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE'
            }
        )
        response = await model.generate_content_async(
            system_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.9,
                max_output_tokens=2048,
                response_mime_type="application/json"
            )
        )
        
        # Parse the response
        story_data = json.loads(response.text)
        
        # Validate structure
        if not all(key in story_data for key in ["title", "pages"]):
            raise ValueError("Invalid story structure")
        
        # Add metadata
        story_data["metadata"] = {
            "ageGroup": age_group,
            "tone": tone,
            "language": language,
            "pageCount": len(story_data["pages"])
        }
        
        logger.info(f"Generated story: {story_data['title']} with {len(story_data['pages'])} pages")
        return story_data
        
    except Exception as e:
        logger.error(f"Error generating story: {str(e)}")
        raise

async def generate_mock_story(prompt: str, age_group: str, tone: str, language: str, config: Dict) -> Dict:
    """Generate a mock story for testing"""
    logger.info("Generating mock story for testing")
    
    # Create age-appropriate mock content
    if "0-6 months" in age_group:
        pages = [
            {
                "pageNumber": 1,
                "text": "Look! A happy sun!",
                "imagePrompt": "bright yellow sun with a smiling face on white background",
                "interactiveElement": "Tap the sun!"
            },
            {
                "pageNumber": 2,
                "text": "The sun is yellow!",
                "imagePrompt": "large yellow circle on white background",
                "interactiveElement": "Say 'yellow'!"
            },
            {
                "pageNumber": 3,
                "text": "Bye bye, sun!",
                "imagePrompt": "sun waving goodbye",
                "interactiveElement": "Wave bye-bye!"
            }
        ]
    elif "6-18 months" in age_group:
        pages = [
            {
                "pageNumber": 1,
                "text": f"Once there was a {prompt.lower()}",
                "imagePrompt": f"colorful illustration of {prompt}",
                "interactiveElement": "Point to the picture!"
            },
            {
                "pageNumber": 2,
                "text": "They loved to play and laugh!",
                "imagePrompt": "happy characters playing",
                "interactiveElement": "Clap your hands!"
            },
            {
                "pageNumber": 3,
                "text": "Time for a nap. Good night!",
                "imagePrompt": "peaceful sleeping scene",
                "interactiveElement": "Shhh... sleeping"
            }
        ]
    else:
        # For older children
        pages = [
            {
                "pageNumber": 1,
                "text": f"In a {tone} land far away, {prompt}. This was the beginning of an amazing adventure!",
                "imagePrompt": f"A {tone} scene showing {prompt} in a fantastical setting",
                "interactiveElement": "What do you see in the picture?"
            },
            {
                "pageNumber": 2,
                "text": "Every day brought new discoveries and wonderful surprises. The world was full of magic!",
                "imagePrompt": f"A magical scene with {tone} elements and bright colors",
                "interactiveElement": "Count the magical objects!"
            },
            {
                "pageNumber": 3,
                "text": "Friends gathered from near and far to join the adventure. Together, they were unstoppable!",
                "imagePrompt": "A group of diverse friendly characters on an adventure",
                "interactiveElement": "Which friend is your favorite?"
            },
            {
                "pageNumber": 4,
                "text": "And so the adventure continued, with more stories to tell another day. The end!",
                "imagePrompt": f"A beautiful sunset scene with {tone} atmosphere",
                "interactiveElement": "Tell your own ending!"
            }
        ]
    
    return {
        "title": f"The {tone.title()} Adventures of {prompt.title()}",
        "pages": pages[:config["pages"]],  # Limit to configured page count
        "metadata": {
            "ageGroup": age_group,
            "tone": tone,
            "language": language,
            "pageCount": len(pages)
        }
    }