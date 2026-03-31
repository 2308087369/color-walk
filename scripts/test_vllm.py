import requests
import json
import base64
import os

# vLLM OpenAI-compatible API endpoint
API_URL = "http://127.0.0.1:5130/v1/chat/completions"
# The model name corresponds to the directory name we passed to vLLM
MODEL_NAME = "/gcl/my_project/color-city/models_llm/Qwen/Qwen3___5-0___8B"

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def test_multimodal():
    print("Testing vLLM multimodal inference...")
    
    # Check if a test image exists, otherwise create a simple one
    test_img_path = "test_red.jpg"
    if not os.path.exists(test_img_path):
        print("Test image not found. Creating a simple red square image...")
        import cv2
        import numpy as np
        img = np.ones((100, 100, 3), dtype=np.uint8) * 255
        img[25:75, 25:75] = [0, 0, 255]
        cv2.imwrite(test_img_path, img)
        
    # Base64 encode the image
    base64_image = encode_image(test_img_path)
    
    # Construct the OpenAI-compatible request payload
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image. What color is the main object?"},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 300,
        "temperature": 0.7
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print(f"Sending request to {API_URL}...")
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        print("\n--- Response ---")
        print(result['choices'][0]['message']['content'])
        print("----------------")
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error calling vLLM API: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response content: {e.response.text}")

if __name__ == "__main__":
    test_multimodal()
