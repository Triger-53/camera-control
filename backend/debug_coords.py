#!/usr/bin/env python3
"""Debug script to test coordinate systems."""

import atomacos
from AppKit import NSWorkspace
import pyautogui
import Quartz
import time

print("Starting in 12 seconds... Switch to the app you want to test!")
for i in range(12, 0, -1):
    print(f"{i}...", end=" ", flush=True)
    time.sleep(1)
print("\n")

# Get frontmost app
ns_app = NSWorkspace.sharedWorkspace().frontmostApplication()
pid = ns_app.processIdentifier()
print(f"Active app: {ns_app.localizedName()} (PID: {pid})")

# Get app via atomacos
app = atomacos.getAppRefByPid(pid)
windows = app.windows()

print(f"Found {len(windows)} window(s)\n")

for idx, window in enumerate(windows):
    # Get window position and size
    win_pos = getattr(window, 'AXPosition', None)
    win_size = getattr(window, 'AXSize', None)
    win_title = getattr(window, 'AXTitle', '')
    
    print(f"Window {idx}: '{win_title}'")
    print(f"  Position: {win_pos}")
    print(f"  Size: {win_size}")
    
    # Recursively find ALL buttons in this window
    buttons_found = []
    
    def find_all_buttons(element, depth=0, max_depth=5):
        if depth > max_depth:
            return
        
        try:
            role = getattr(element, 'AXRole', '')
            title = getattr(element, 'AXTitle', '')
            desc = getattr(element, 'AXDescription', '')
            pos = getattr(element, 'AXPosition', None)
            size = getattr(element, 'AXSize', None)
            
            # Check if this is a button
            if 'Button' in role:
                buttons_found.append({
                    'title': title or desc or '(no title)',
                    'pos': pos,
                    'size': size
                })
            
            # Recurse through children
            try:
                for child in element.AXChildren:
                    find_all_buttons(child, depth + 1, max_depth)
            except:
                pass
        except:
            pass
    
    find_all_buttons(window)
    
    if buttons_found:
        print(f"  Found {len(buttons_found)} button(s):")
        for i, btn in enumerate(buttons_found):
            print(f"    {i+1}. '{btn['title']}' at {btn['pos']}, size {btn['size']}")
            
            # Check if this is Reload
            if 'Reload' in btn['title'] and btn['pos'] and btn['size']:
                print(f"\n  >>> RELOAD BUTTON FOUND!")
                center_x = btn['pos'][0] + btn['size'][0] / 2
                center_y = btn['pos'][1] + btn['size'][1] / 2
                print(f"      Calculated center: ({center_x:.1f}, {center_y:.1f})")
                
                print(f"\n>>> Move your mouse to the VISUAL CENTER of the Reload button")
                print(f">>> Then press ENTER")
                input()
                
                actual_mouse = pyautogui.position()
                print(f"\n=== COORDINATE ANALYSIS ===")
                print(f"Accessibility says: ({center_x:.1f}, {center_y:.1f})")
                print(f"Actual mouse at:    {actual_mouse}")
                print(f"\nOffset needed:")
                print(f"  X offset: {actual_mouse.x - center_x:.1f} pixels")
                print(f"  Y offset: {actual_mouse.y - center_y:.1f} pixels")
                
                print("\nDone!")
                exit(0)
    
    print()

print("No toolbar with buttons found!")
