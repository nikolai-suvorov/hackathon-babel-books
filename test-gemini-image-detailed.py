import google.generativeai as genai
import os
import asyncio

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def test_image_generation_models():
    """Test different image generation approaches with Gemini"""
    
    # Test 1: Try the experimental image generation model
    print("Test 1: Gemini 2.0 Flash Image Generation (Experimental)")
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp-image-generation')
        response = await model.generate_content_async(
            "Create an image of a friendly cartoon cat in a garden"
        )
        print(f"Response: {response}")
        if response.text:
            print(f"Text response: {response.text[:200]}...")
        if hasattr(response, 'images') or hasattr(response, 'image'):
            print("Image data found in response!")
        else:
            print("No image data in response")
        print()
    except Exception as e:
        print(f"Error: {e}\n")
    
    # Test 2: Try Imagen model
    print("Test 2: Imagen 3.0")
    try:
        # Note: Imagen uses a different API structure
        model = genai.GenerativeModel('imagen-3.0-generate-002')
        # This model uses 'predict' method according to the listing
        print("Note: Imagen models use 'predict' method, not 'generate_content'")
        print("Would need different API approach for Imagen\n")
    except Exception as e:
        print(f"Error: {e}\n")
    
    # Test 3: Try to generate image description and use external service
    print("Test 3: Generate detailed image description")
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = await model.generate_content_async(
            """Create a detailed image description for a children's book illustration:
            - Subject: A friendly orange cat exploring a magical garden
            - Style: Colorful, whimsical, child-friendly
            - Details: Include specific colors, composition, and mood
            
            Format the response as a detailed prompt for image generation."""
        )
        print(f"Image description: {response.text[:500]}...")
        print("\nThis description could be used with external image generation services")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_image_generation_models())