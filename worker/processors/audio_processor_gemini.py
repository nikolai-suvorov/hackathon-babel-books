import os
import google.generativeai as genai
from typing import List, Dict
import logging
import base64
from io import BytesIO
import json

logger = logging.getLogger(__name__)

# Configure Gemini
if os.getenv("USE_MOCK_AUDIO") != "true":
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_with_gemini_tts(text: str, language: str, age_group: str) -> str:
    """Generate audio using Gemini's TTS models"""
    try:
        # Use Gemini 2.5 Flash TTS model
        tts_model = genai.GenerativeModel('gemini-2.5-flash-preview-tts')
        
        # Create a voice prompt based on age group
        voice_settings = {
            "0-6 months": "gentle, slow, soothing female voice",
            "6-18 months": "cheerful, playful female voice with clear pronunciation",
            "18-36 months": "animated, expressive female voice",
            "3-4 years": "warm storyteller voice with character expressions",
            "4-5 years": "dynamic narrator voice with emotion"
        }
        
        voice_style = voice_settings.get(age_group, "friendly female narrator voice")
        
        # Create TTS prompt
        tts_prompt = f"""Generate speech audio for this children's story text in {language}.
        Voice style: {voice_style}
        Text to narrate: {text}"""
        
        logger.info(f"Attempting TTS generation for {language} text")
        
        # Configure generation to only output audio
        generation_config = genai.GenerationConfig(
            temperature=0.7,
            response_modalities=["audio"]  # Only request audio output
        )
        
        response = await tts_model.generate_content_async(
            tts_prompt,
            generation_config=generation_config
        )
        
        # Check for audio data in response
        if hasattr(response, '_result') and hasattr(response._result, 'candidates'):
            for candidate in response._result.candidates:
                if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        # Check for inline_data with audio
                        if hasattr(part, 'inline_data') and part.inline_data:
                            audio_data = part.inline_data.data
                            mime_type = part.inline_data.mime_type
                            logger.info(f"Generated audio with mime_type: {mime_type}")
                            return audio_data
        
        # If no audio generated, return None
        logger.warning("No audio data in TTS response")
        return None
        
    except Exception as e:
        logger.error(f"Gemini TTS error: {str(e)}")
        return None