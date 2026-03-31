import requests
import base64
import os
import json
import cv2

# vLLM OpenAI-compatible API endpoint
API_URL = "http://127.0.0.1:5130/v1/chat/completions"
# The model name corresponds to the directory name we passed to vLLM
MODEL_NAME = "/gcl/my_project/color-city/models_llm/Qwen/Qwen3___5-0___8B"

def encode_image(image_path: str, max_size: int = 512) -> str:
    """
    Read an image, resize it if it's too large to save token context length,
    compress it, and encode it to base64.
    """
    # Read image using OpenCV
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")
        
    # Get current dimensions
    h, w = img.shape[:2]
    
    # Resize if the image is larger than max_size on its longest edge
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
    # Encode image to JPEG format in memory with moderate quality
    success, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not success:
        raise ValueError("Failed to encode image to JPEG")
        
    # Convert to base64
    return base64.b64encode(buffer).decode('utf-8')

def generate_image_description(image_path: str, color_name: str) -> str:
    """
    Generate a trendy Xiaohongshu-style description for an image using vLLM.
    Returns the generated description or an empty string if it fails.
    """
    if not os.path.exists(image_path):
        return ""

    try:
        base64_image = encode_image(image_path)
        
        prompt = (
            f"请仔细观察这张图片，这是一张关于中国传统颜色“{color_name}”的打卡照片。"
            "请用小红书的潮流风格，写一段50字左右的文案来描述这张图片和颜色的意境，"
            "要求：文风生动活泼，富有诗意或时尚感，包含适当的emoji表情。不要回复任何与文案无关的内容。"
        )
        
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 150,
            "temperature": 0.7
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        description = result['choices'][0]['message']['content'].strip()
        
        return description
        
    except Exception as e:
        print(f"Error generating description via vLLM: {e}")
        return ""
