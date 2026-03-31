import cv2
import numpy as np

def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex string (e.g., '#FF0000') to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def detect_color_in_image(
    image_bytes: bytes,
    target_hex: str,
    tolerance: int = 60,
    crop_x: float | None = None,
    crop_y: float | None = None,
    crop_w: float | None = None,
    crop_h: float | None = None
) -> dict:
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Invalid image format or corrupted image")

    if (
        crop_x is not None and crop_y is not None and
        crop_w is not None and crop_h is not None
    ):
        h, w = img.shape[:2]
        x1 = max(0, min(int(crop_x * w), w - 1))
        y1 = max(0, min(int(crop_y * h), h - 1))
        x2 = max(x1 + 1, min(int((crop_x + crop_w) * w), w))
        y2 = max(y1 + 1, min(int((crop_y + crop_h) * h), h))
        img = img[y1:y2, x1:x2]

    target_rgb = hex_to_rgb(target_hex)

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    target_rgb_arr = np.array(target_rgb, dtype=np.float32)
    dist_rgb = np.sqrt(np.sum((img_rgb.astype(np.float32) - target_rgb_arr) ** 2, axis=2))
    mask_rgb = dist_rgb <= tolerance

    target_img_bgr = np.uint8([[[target_rgb[2], target_rgb[1], target_rgb[0]]]])

    img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    target_hsv_arr = cv2.cvtColor(target_img_bgr, cv2.COLOR_BGR2HSV)[0][0].astype(np.float32)

    img_hsv_float = img_hsv.astype(np.float32)
    h_diff = np.abs(img_hsv_float[:,:,0] - target_hsv_arr[0])
    h_dist = np.minimum(h_diff, 180 - h_diff)
    s_dist = img_hsv_float[:,:,1] - target_hsv_arr[1]
    v_dist = img_hsv_float[:,:,2] - target_hsv_arr[2]

    dist_hsv = np.sqrt((h_dist * 1.41) ** 2 + s_dist ** 2 + v_dist ** 2)
    mask_hsv = dist_hsv <= tolerance

    img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    target_lab_arr = cv2.cvtColor(target_img_bgr, cv2.COLOR_BGR2LAB)[0][0].astype(np.float32)
    dist_lab = np.sqrt(np.sum((img_lab.astype(np.float32) - target_lab_arr) ** 2, axis=2))
    mask_lab = dist_lab <= (tolerance * 0.8)

    final_mask = mask_rgb | mask_hsv | mask_lab
    matching_pixels = np.count_nonzero(final_mask)
    total_pixels = final_mask.size
    percentage = (matching_pixels / total_pixels) * 100
    matched_by = []
    if np.count_nonzero(mask_rgb) > 0:
        matched_by.append("rgb")
    if np.count_nonzero(mask_hsv) > 0:
        matched_by.append("hsv")
    if np.count_nonzero(mask_lab) > 0:
        matched_by.append("lab")

    failure_reasons = []
    if percentage < 1.0:
        rgb_min = float(dist_rgb.min())
        hsv_min = float(dist_hsv.min())
        lab_min = float(dist_lab.min())
        if rgb_min > tolerance and hsv_min > tolerance and lab_min > tolerance * 0.8:
            failure_reasons.append("颜色偏差较大")
        if percentage < 0.3:
            failure_reasons.append("目标颜色面积不足")
        if img_hsv_float[:, :, 2].mean() < 60:
            failure_reasons.append("画面亮度较低")
        if len(failure_reasons) == 0:
            failure_reasons.append("目标颜色不明显")

    return {
        "found": matching_pixels > 0,
        "percentage": round(percentage, 4),
        "matching_pixels": matching_pixels,
        "total_pixels": total_pixels,
        "matched_by": matched_by,
        "failure_reasons": failure_reasons
    }
