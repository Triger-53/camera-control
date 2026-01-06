import pyautogui
import time
import sys

def test_mouse():
    print(f"Screen size: {pyautogui.size()}")
    print(f"Current position: {pyautogui.position()}")
    
    target_x = 500
    target_y = 500
    
    print(f"Moving to ({target_x}, {target_y})...")
    start_time = time.time()
    pyautogui.moveTo(target_x, target_y, duration=0.5)
    end_time = time.time()
    
    print(f"Movement took {end_time - start_time:.2f} seconds")
    print(f"Final position: {pyautogui.position()}")
    
    if pyautogui.position() == (target_x, target_y):
        print("Position accurate.")
    else:
        print("Position INACCURATE.")

if __name__ == "__main__":
    test_mouse()
