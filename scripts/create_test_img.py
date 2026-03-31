import cv2
import numpy as np
import os

def create_test_image(filename="test_red.jpg"):
    # Create a 100x100 image (BGR format for OpenCV)
    # Background: White (255, 255, 255)
    img = np.ones((100, 100, 3), dtype=np.uint8) * 255
    
    # Draw a pure red square in the middle (BGR format: Blue=0, Green=0, Red=255)
    # The square will be 50x50, which is 25% of the total 100x100 area
    img[25:75, 25:75] = [0, 0, 255]
    
    cv2.imwrite(filename, img)
    return filename

if __name__ == "__main__":
    create_test_image()
