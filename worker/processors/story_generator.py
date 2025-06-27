import os
import google.generativeai as genai
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)

# Configure Gemini
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
        model = genai.GenerativeModel('gemini-1.5-flash')
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