import google.generativeai as genai
import os

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# List available models
print("Available models:")
for model in genai.list_models():
    print(f"- {model.name}: {model.display_name}")
    print(f"  Supported methods: {model.supported_generation_methods}")
    print()

# Check if there's an image generation model
print("\nChecking for image generation capabilities...")
try:
    # Try to use Gemini Pro Vision for image understanding (not generation)
    model = genai.GenerativeModel('gemini-pro-vision')
    print(f"Model gemini-pro-vision available")
except Exception as e:
    print(f"Error: {e}")

# Note: As of now, Gemini doesn't directly support image generation
# We would need to use a different service like Imagen API or Stable Diffusion
print("\nNote: Gemini currently focuses on text and image understanding, not image generation.")
print("For image generation, consider using:")
print("- Google's Imagen API (if available)")
print("- Stable Diffusion API")
print("- DALL-E API")
print("- Or continue with placeholder images for MVP")