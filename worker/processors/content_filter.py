import re
from typing import List
import logging

logger = logging.getLogger(__name__)

# Inappropriate content patterns
INAPPROPRIATE_PATTERNS = [
    # Violence
    r'\b(kill|murder|death|die|blood|gore|weapon|gun|knife|fight|punch|hit)\b',
    # Adult content
    r'\b(sex|nude|kiss|romance|dating|marry|pregnant)\b',
    # Scary content
    r'\b(monster|demon|devil|hell|nightmare|scary|horror|ghost)\b',
    # Inappropriate language
    r'\b(damn|hell|crap|stupid|hate|ugly)\b',
]

# Safe replacement suggestions
SAFE_ALTERNATIVES = {
    "fight": "play",
    "hit": "hug",
    "scary": "silly",
    "monster": "friendly creature",
    "hate": "don't like",
    "stupid": "silly",
}

async def check_prompt_safety(prompt: str) -> bool:
    """Check if a prompt is safe for children's content"""
    prompt_lower = prompt.lower()
    
    for pattern in INAPPROPRIATE_PATTERNS:
        if re.search(pattern, prompt_lower):
            logger.warning(f"Inappropriate content detected in prompt: {pattern}")
            return False
    
    return True

async def sanitize_text(text: str) -> str:
    """Sanitize text by replacing inappropriate words"""
    text_lower = text.lower()
    
    for bad_word, safe_word in SAFE_ALTERNATIVES.items():
        text = re.sub(
            rf'\b{bad_word}\b', 
            safe_word, 
            text, 
            flags=re.IGNORECASE
        )
    
    return text

async def check_image_prompt_safety(image_prompt: str) -> bool:
    """Ensure image prompts will generate child-appropriate images"""
    # Add "child-friendly", "cartoon style" to all prompts
    safe_modifiers = [
        "child-friendly",
        "cartoon style",
        "bright colors",
        "happy",
        "safe for kids"
    ]
    
    # Check for inappropriate content
    if not await check_prompt_safety(image_prompt):
        return False
    
    return True

def make_image_prompt_safe(image_prompt: str, age_group: str) -> str:
    """Enhance image prompt with safety modifiers"""
    age_modifiers = {
        "0-6 months": "simple shapes, high contrast, baby-safe",
        "6-18 months": "bright primary colors, rounded shapes, toddler-friendly",
        "18-36 months": "colorful, friendly faces, preschool appropriate",
        "3-4 years": "playful, imaginative, preschool style",
        "4-5 years": "detailed but child-appropriate, kindergarten style"
    }
    
    safe_prompt = f"{image_prompt}. Style: {age_modifiers.get(age_group, 'child-friendly')}. "
    safe_prompt += "Cartoon illustration, no scary elements, bright and cheerful."
    
    return safe_prompt