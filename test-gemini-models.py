import google.generativeai as genai
import os

# Configure with API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY", "AIzaSyDIh57faYlMHNcEwbb7rpCIXpCAjXhGjH8"))

print("Available Gemini Models:")
print("-" * 50)

try:
    # List all available models
    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            print(f"Model: {model.name}")
            print(f"  Display Name: {model.display_name}")
            print(f"  Description: {model.description}")
            print(f"  Input Token Limit: {model.input_token_limit}")
            print(f"  Output Token Limit: {model.output_token_limit}")
            print(f"  Supported Methods: {model.supported_generation_methods}")
            print()
except Exception as e:
    print(f"Error listing models: {e}")

# Check specific models we're interested in
test_models = [
    "gemini-1.5-flash",
    "gemini-1.5-pro", 
    "gemini-2.0-flash-exp",
    "gemini-pro",
    "gemini-pro-vision"
]

print("\nTesting specific models:")
print("-" * 50)

for model_name in test_models:
    try:
        model = genai.GenerativeModel(model_name)
        print(f"✅ {model_name} - Available")
    except Exception as e:
        print(f"❌ {model_name} - Not available: {e}")