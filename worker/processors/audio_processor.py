import os
from typing import List, Dict
import logging
import io
import base64
import google.generativeai as genai
from gtts import gTTS
from pydub import AudioSegment
from pydub.generators import Sine

logger = logging.getLogger(__name__)

# Configure Gemini if available
if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Background music styles by tone
MUSIC_STYLES = {
    "funny": {"tempo": 120, "pitch": "high", "instruments": ["xylophone", "kazoo"]},
    "magical": {"tempo": 80, "pitch": "medium", "instruments": ["harp", "chimes"]},
    "scary": {"tempo": 60, "pitch": "low", "instruments": ["strings", "ambient"]},
    "wholesome": {"tempo": 90, "pitch": "medium", "instruments": ["piano", "acoustic"]},
    "adventurous": {"tempo": 110, "pitch": "medium", "instruments": ["drums", "trumpet"]}
}

# TTS voice settings by age
VOICE_SETTINGS = {
    "0-6 months": {"speed": "slow", "pitch": "high", "emphasis": "soft"},
    "6-18 months": {"speed": "slow", "pitch": "medium", "emphasis": "playful"},
    "18-36 months": {"speed": "medium", "pitch": "medium", "emphasis": "expressive"},
    "3-4 years": {"speed": "medium", "pitch": "medium", "emphasis": "animated"},
    "4-5 years": {"speed": "normal", "pitch": "normal", "emphasis": "dynamic"}
}

async def generate_narration(
    pages: List[Dict], 
    language: str, 
    tone: str, 
    age_group: str
) -> List[Dict]:
    """Generate narration audio for each page"""
    audio_files = []
    voice_config = VOICE_SETTINGS.get(age_group, VOICE_SETTINGS["3-4 years"])
    
    for page in pages:
        try:
            # Try Gemini TTS first
            try:
                from .audio_processor_gemini import generate_with_gemini_tts
                gemini_audio = await generate_with_gemini_tts(
                    page["text"],
                    language,
                    age_group
                )
                
                if gemini_audio:
                    logger.info(f"Generated audio with Gemini TTS for page {page['pageNumber']}")
                    audio_files.append({
                        "pageNumber": page["pageNumber"],
                        "audioData": gemini_audio,
                        "duration": estimate_duration(page["text"]),
                        "format": "mp3"
                    })
                    continue
            except Exception as e:
                logger.warning(f"Gemini TTS failed: {e}, falling back to gTTS")
            
            # Fall back to gTTS
            narration = await generate_tts(
                page["text"],
                language,
                voice_config
            )
            
            # Generate background music
            music = generate_background_music(
                duration=len(page["text"]) * 0.1,  # Rough estimate
                tone=tone
            )
            
            # Mix narration with background music
            final_audio = mix_audio(narration, music)
            
            # Add sound effects if there are interactive elements
            if page.get("interactiveElement"):
                final_audio = add_sound_effects(final_audio, page["interactiveElement"])
            
            audio_files.append({
                "pageNumber": page["pageNumber"],
                "audioData": audio_to_base64(final_audio),
                "duration": len(final_audio) / 1000.0,  # Convert to seconds
                "format": "mp3"
            })
            
            logger.info(f"Generated audio for page {page['pageNumber']}")
            
        except Exception as e:
            logger.error(f"Error generating audio for page {page['pageNumber']}: {str(e)}")
            raise
    
    return audio_files

async def generate_tts(text: str, language: str, voice_config: Dict):
    """Generate text-to-speech audio"""
    try:
        # Map language codes to gTTS language codes
        lang_map = {
            "English": "en",
            "Spanish": "es",
            "French": "fr",
            "German": "de",
            "Italian": "it",
            "Hindi": "hi",
            "Russian": "ru"
        }
        
        tts_lang = lang_map.get(language, "en")
        
        # Generate TTS
        tts = gTTS(text=text, lang=tts_lang, slow=(voice_config["speed"] == "slow"))
        
        # Save to buffer
        buffer = io.BytesIO()
        tts.write_to_fp(buffer)
        buffer.seek(0)
        
        # Load as AudioSegment
        audio = AudioSegment.from_mp3(buffer)
        
        # Apply voice modifications based on age group
        if voice_config["pitch"] == "high":
            audio = audio._spawn(audio.raw_data, overrides={
                "frame_rate": int(audio.frame_rate * 1.1)
            })
        
        return audio
        
    except Exception as e:
        logger.error(f"TTS generation error: {str(e)}")
        # Return a simple beep as fallback
        return Sine(440).to_audio_segment(duration=1000)

def generate_background_music(duration: float, tone: str):
    """Generate simple background music based on tone"""
    music_config = MUSIC_STYLES.get(tone, MUSIC_STYLES["wholesome"])
    
    # For now, generate a simple tone
    # In production, this would load actual music files
    frequency = 440 if music_config["pitch"] == "high" else 220
    music = Sine(frequency).to_audio_segment(duration=int(duration * 1000))
    
    # Make it quieter (background level)
    music = music - 20  # Reduce by 20dB
    
    return music

def mix_audio(narration, music):
    """Mix narration with background music"""
    # Ensure music is at least as long as narration
    if len(music) < len(narration):
        music = music * (len(narration) // len(music) + 1)
    
    # Trim music to match narration length
    music = music[:len(narration)]
    
    # Mix with narration prominent
    mixed = narration.overlay(music)
    
    return mixed

def add_sound_effects(audio, interactive_element: str):
    """Add sound effects for interactive elements"""
    # Simple sound effect at the end
    # In production, this would add contextual sounds
    beep = Sine(880).to_audio_segment(duration=200)
    beep = beep - 10  # Make it quieter
    
    return audio + beep

def audio_to_base64(audio) -> str:
    """Convert AudioSegment to base64 string"""
    buffer = io.BytesIO()
    audio.export(buffer, format="mp3")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode()

def estimate_duration(text: str) -> float:
    """Estimate audio duration based on text length"""
    # Average speaking rate: 150 words per minute
    # Average word length: 5 characters
    words = len(text) / 5
    minutes = words / 150
    return round(minutes * 60, 1)  # Return seconds