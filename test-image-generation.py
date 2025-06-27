import asyncio
import os
import sys
sys.path.append('/app')

from processors.image_processor import generate_with_gemini, generate_story_images

async def test_image_generation():
    print("Testing Gemini image generation...")
    
    # Test direct image generation
    try:
        print("\n1. Testing direct image generation...")
        prompt = "A friendly cartoon cat sitting in a colorful garden, children's book illustration style"
        image_data = await generate_with_gemini(prompt, "3-4 years")
        print(f"✅ Image generated! Data length: {len(image_data)} characters")
    except Exception as e:
        print(f"❌ Direct generation failed: {e}")
    
    # Test with story pages
    try:
        print("\n2. Testing story page image generation...")
        test_pages = [
            {
                "pageNumber": 1,
                "text": "Luna the cat loved to explore",
                "imagePrompt": "A curious orange cat with big eyes looking at a butterfly"
            },
            {
                "pageNumber": 2,
                "text": "She found a magical door",
                "imagePrompt": "A small cat standing in front of a glowing doorway"
            }
        ]
        
        images = await generate_story_images(test_pages, "3-4 years")
        print(f"✅ Generated {len(images)} images")
        for img in images:
            print(f"   Page {img['pageNumber']}: {img['prompt'][:50]}...")
            print(f"   Data length: {len(img['imageData'])} characters")
    except Exception as e:
        print(f"❌ Story image generation failed: {e}")

if __name__ == "__main__":
    # Set to use real Gemini
    os.environ["USE_MOCK_STORIES"] = "false"
    os.environ["USE_MOCK_IMAGES"] = "false"
    
    asyncio.run(test_image_generation())