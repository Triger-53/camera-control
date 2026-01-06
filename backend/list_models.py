import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment.")
genai.configure(api_key=GOOGLE_API_KEY)

print("Listing models...")
try:
    for m in genai.list_models():
        print(f"Name: {m.name}")
        print(f"Supported methods: {m.supported_generation_methods}")
        print("-" * 20)
except Exception as e:
    print(f"Error: {e}")
