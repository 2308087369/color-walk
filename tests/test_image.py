import requests
import sys
import os

BASE_URL = "http://127.0.0.1:8000"

def test_image_recognition():
    print("Testing Image Color Recognition API...")
    
    img_path = "test_red.jpg"
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found.")
        return

    # First, get the ID for "红色" (Red) #FF0000
    r = requests.get(f"{BASE_URL}/colors/?page=1&size=10")
    if r.status_code != 200:
        print("Failed to get colors.")
        return
        
    colors = r.json().get("items", [])
    red_color = next((c for c in colors if c["hex_code"] == "#FF0000"), None)
    
    if not red_color:
        print("Could not find color with hex #FF0000 in the first 10 items.")
        return
        
    print(f"Found color: {red_color['name']} (ID: {red_color['id']})")
    
    # Now test the detection endpoint
    print("\n--- Uploading Image for Detection ---")
    url = f"{BASE_URL}/colors/detect"
    
    with open(img_path, "rb") as f:
        files = {"file": (img_path, f, "image/jpeg")}
        data = {
            "color_id": red_color["id"],
            "tolerance": 30
        }
        r = requests.post(url, files=files, data=data)
        
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        result = r.json()
        print(f"Color Detected: {result['found']}")
        print(f"Matching Percentage: {result['percentage']}%")
        print(f"Matching Pixels: {result['matching_pixels']} / {result['total_pixels']}")
    else:
        print(r.text)

if __name__ == "__main__":
    test_image_recognition()
