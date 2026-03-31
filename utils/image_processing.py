import cv2
import numpy as np

def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex string (e.g., '#FF0000') to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def detect_color_in_image(image_bytes: bytes, target_hex: str, tolerance: int = 60) -> dict:
    """
    Detect if a target color exists in the image using RGB, HSV, and LAB color spaces.
    A pixel is considered a match if it falls within the tolerance in ANY of the three color spaces.
    
    Args:
        image_bytes: The raw image bytes.
        target_hex: The target hex color string (e.g., '#FF0000').
        tolerance: Base tolerance value for distance calculation.
        
    Returns:
        dict: Detection result containing boolean 'found' and matching 'percentage'.
    """
    # Convert image bytes to numpy array and decode using OpenCV
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Invalid image format or corrupted image")
        
    # Get target RGB
    target_rgb = hex_to_rgb(target_hex)
    
    # 1. RGB Processing
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    target_rgb_arr = np.array(target_rgb, dtype=np.float32)
    dist_rgb = np.sqrt(np.sum((img_rgb.astype(np.float32) - target_rgb_arr) ** 2, axis=2))
    mask_rgb = dist_rgb <= tolerance

    # Create a 1x1 pixel image of the target color to convert to HSV and LAB
    target_img_bgr = np.uint8([[[target_rgb[2], target_rgb[1], target_rgb[0]]]])
    
    # 2. HSV Processing
    img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    target_hsv_arr = cv2.cvtColor(target_img_bgr, cv2.COLOR_BGR2HSV)[0][0].astype(np.float32)
    
    # In OpenCV HSV: H is 0-179, S is 0-255, V is 0-255
    # Hue is circular, so distance needs special handling
    img_hsv_float = img_hsv.astype(np.float32)
    h_diff = np.abs(img_hsv_float[:,:,0] - target_hsv_arr[0])
    h_dist = np.minimum(h_diff, 180 - h_diff) # Wrap around at 180
    
    s_dist = img_hsv_float[:,:,1] - target_hsv_arr[1]
    v_dist = img_hsv_float[:,:,2] - target_hsv_arr[2]
    
    # Scale H to have similar weight to S and V (180 max vs 255 max)
    dist_hsv = np.sqrt((h_dist * 1.41) ** 2 + s_dist ** 2 + v_dist ** 2)
    # HSV distances tend to be a bit different scale, adjusting tolerance slightly
    mask_hsv = dist_hsv <= tolerance

    # 3. LAB Processing
    img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    target_lab_arr = cv2.cvtColor(target_img_bgr, cv2.COLOR_BGR2LAB)[0][0].astype(np.float32)
    dist_lab = np.sqrt(np.sum((img_lab.astype(np.float32) - target_lab_arr) ** 2, axis=2))
    # LAB distances in OpenCV L(0-255) A(0-255) B(0-255)
    # The Euclidean distance in LAB space corresponds well to human perception (Delta E)
    # We can use a slightly stricter tolerance for LAB as it's more accurate
    mask_lab = dist_lab <= (tolerance * 0.8)

    # Combine masks (Logical OR: if any of the three criteria matches)
    final_mask = mask_rgb | mask_hsv | mask_lab
    
    # Calculate the percentage of matching pixels
    matching_pixels = np.count_nonzero(final_mask)
    total_pixels = final_mask.size
    percentage = (matching_pixels / total_pixels) * 100
    
    return {
        "found": matching_pixels > 0,
        "percentage": round(percentage, 4),
        "matching_pixels": matching_pixels,
        "total_pixels": total_pixels
    }
