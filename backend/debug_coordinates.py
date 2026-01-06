import pyautogui
import atomacos
import time
import Quartz

def debug_coordinates():
    print("--- Debugging Coordinates ---")
    
    # 1. PyAutoGUI Screen Size
    py_size = pyautogui.size()
    print(f"PyAutoGUI Size: {py_size}")
    
    # 2. Quartz (macOS Native) Screen Size
    main_display_id = Quartz.CGMainDisplayID()
    pixels_wide = Quartz.CGDisplayPixelsWide(main_display_id)
    pixels_high = Quartz.CGDisplayPixelsHigh(main_display_id)
    print(f"Quartz Pixels: {pixels_wide}x{pixels_high}")
    
    # 3. Accessibility Tree Root Size
    try:
        # Get the system-wide element (desktop)
        # Note: atomacos.getFrontmostApp() gets the app, but we want to check the screen bounds reported by AX
        # We'll try to get the Finder's desktop window or just the frontmost app's window
        app = atomacos.getAppRefByPid(atomacos.getFrontmostApp().pid)
        windows = app.windows()
        if windows:
            window = windows[0]
            print(f"Frontmost App Window Position: {window.AXPosition}")
            print(f"Frontmost App Window Size: {window.AXSize}")
        else:
            print("No windows found for frontmost app.")
            
    except Exception as e:
        print(f"Accessibility Error: {e}")

    # Calculate Scaling Factor
    scale_x = pixels_wide / py_size.width
    scale_y = pixels_high / py_size.height
    print(f"Calculated Scaling Factor: X={scale_x}, Y={scale_y}")
    
    if scale_x != 1.0 or scale_y != 1.0:
        print("WARNING: Retina display scaling detected!")
        print("If atomacos returns physical pixels and pyautogui uses logical points, coordinates will be off.")

if __name__ == "__main__":
    debug_coordinates()
