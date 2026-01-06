import pyautogui
import atomacos
import time
import math
import random
import subprocess
import sys
from typing import Dict, Any, List
from AppKit import NSWorkspace

# Safety fail-safe
pyautogui.FAILSAFE = True

def get_accessibility_tree() -> Dict[str, Any]:
    """
    Dumps the accessibility tree of the currently active window.
    This is the "XPath" equivalent for desktop apps.
    """
    try:
        # Use NSWorkspace to get the true frontmost app
        ws = NSWorkspace.sharedWorkspace()
        ns_app = ws.frontmostApplication()
        pid = ns_app.processIdentifier()
        
        app = atomacos.getAppRefByPid(pid)
        windows = app.windows()
        
        if not windows:
            # Fallback: Try to find any window if main list is empty (sometimes needed for some apps)
            try:
                if app.AXFocusedWindow:
                    windows = [app.AXFocusedWindow]
            except:
                pass
                
        if not windows:
             return {"error": f"No active windows found for {ns_app.localizedName()} (PID: {pid})."}
        
        # Interning structures
        strings = []
        string_to_idx = {}
        positions = []
        pos_to_idx = {}
        sizes = []
        size_to_idx = {}
        nodes = []
        id_to_index = {}
        
        def intern_string(s):
            if s is None or s == '':
                return -1
            s_str = str(s)
            if s_str not in string_to_idx:
                string_to_idx[s_str] = len(strings)
                strings.append(s_str)
            return string_to_idx[s_str]
        
        def intern_pos(p):
            if not p:
                return -1
            key = f"{int(p[0])},{int(p[1])}"
            if key not in pos_to_idx:
                pos_to_idx[key] = len(positions)
                positions.append([int(p[0]), int(p[1])])
            return pos_to_idx[key]
        
        def intern_size(s):
            if not s:
                return -1
            key = f"{int(s[0])},{int(s[1])}"
            if key not in size_to_idx:
                size_to_idx[key] = len(sizes)
                sizes.append([int(s[0]), int(s[1])])
            return size_to_idx[key]
        
        def dump_node(node, parent_idx=-1):
            try:
                role = getattr(node, 'AXRole', '')
                # Filter out uninteresting roles
                if role in ['AXGroup', 'AXWindow', 'AXSplitter', 'AXScrollArea', 'AXImage'] and not getattr(node, 'AXTitle', ''):
                    children = node.AXChildren
                    if children:
                        for child in children:
                            dump_node(child, parent_idx)
                    return

                title = getattr(node, 'AXTitle', '')
                description = getattr(node, 'AXDescription', '')
                value = getattr(node, 'AXValue', '')
                position = getattr(node, 'AXPosition', None)
                size = getattr(node, 'AXSize', None)
                
                label = title if title else (description if description else "")
                
                # Skip non-interactive
                if not label and not value and role not in ['AXTextField', 'AXTextArea', 'AXComboBox']:
                    children = node.AXChildren
                    if children:
                        for child in children:
                            dump_node(child, parent_idx)
                    return

                # Pre-calculate CENTER
                if position and size:
                    center_x = int(position[0] + size[0] / 2)
                    center_y = int(position[1] + size[1] / 2)
                else:
                    center_x = -1
                    center_y = -1
                
                # DEBUG: Log Reload button
                if label == "Reload":
                    print(f"DEBUG: Found 'Reload' button at {position} size {size}")
                    print(f"DEBUG: Calculated CENTER sent to AI: [{center_x}, {center_y}]")
                
                # SUPER SIMPLE FORMAT: [role, label, x, y]
                # We drop value/parent for now to keep it dead simple
                nodes.append([role, label, center_x, center_y])
                
                # Process children
                children = node.AXChildren
                if children:
                    for child in children:
                        dump_node(child, len(nodes) - 1)
                    
            except Exception as e:
                pass
        
        # Root node
        nodes.append(["AppRoot", ns_app.localizedName(), -1, -1])
        
        # Process all windows
        for window in windows:
            dump_node(window, 0)
            
        return {
            "nodes": nodes
        }
    except Exception as e:
        return {"error": f"Failed to get accessibility tree: {str(e)}"}

def human_move_mouse(target_x, target_y, speed=0.5, deviation=10):
    """
    Moves the mouse to (target_x, target_y).
    Human movement is currently DEACTIVATED.
    """
    print(f"DEBUG: Moving to ({target_x}, {target_y}) INSTANTLY")
    pyautogui.moveTo(target_x, target_y, duration=0)
    return

    # Original human movement logic preserved below for reference/future restoration
    start_x, start_y = pyautogui.position()
    # ... (rest of the function is unreachable)

def open_application(app_name: str):
    """
    Opens an application using the OS native command.
    """
    if sys.platform == "darwin": # macOS
        subprocess.run(["open", "-a", app_name])
    elif sys.platform == "win32": # Windows
        subprocess.run(["start", app_name], shell=True)
    elif sys.platform == "linux": # Linux
        subprocess.Popen([app_name])

def perform_action(action: str, params: Dict[str, Any] = None):
    """
    Executes a low-level action.
    """
    if params is None:
        params = {}
    
    print(f"DEBUG: perform_action called with action='{action}', params={params}")
        
    if action == "click":
        x = params.get("x")
        y = params.get("y")
        if x is not None and y is not None:
            # If clicking in top ~100px, move to top first to reveal auto-hide toolbar
            if y < 100:
                print(f"DEBUG: Revealing auto-hide toolbar (y={y} < 100)")
                pyautogui.moveTo(x, 0, duration=0)  # Move to top edge
                time.sleep(0.3)  # Wait for toolbar animation
            
            speed = params.get("speed", 0.8) # Default to reasonably fast
            human_move_mouse(x, y, speed=speed)
            pyautogui.click()
        else:
            pyautogui.click()
            
    elif action == "double_click":
        x = params.get("x")
        y = params.get("y")
        if x is not None and y is not None:
            speed = params.get("speed", 0.8)
            human_move_mouse(x, y, speed=speed)
            pyautogui.doubleClick()
        else:
            pyautogui.doubleClick()

    elif action == "right_click":
        x = params.get("x")
        y = params.get("y")
        if x is not None and y is not None:
            speed = params.get("speed", 0.8)
            human_move_mouse(x, y, speed=speed)
            pyautogui.rightClick()
        else:
            pyautogui.rightClick()

    elif action == "drag":
        start_x = params.get("start_x")
        start_y = params.get("start_y")
        end_x = params.get("end_x")
        end_y = params.get("end_y")
        if start_x and start_y and end_x and end_y:
            speed = params.get("speed", 0.8)
            human_move_mouse(start_x, start_y, speed=speed)
            pyautogui.dragTo(end_x, end_y, duration=random.uniform(0.3, 0.6), button='left')

    elif action == "move":
        x = params.get("x")
        y = params.get("y")
        if x is not None and y is not None:
            speed = params.get("speed", 0.8)
            human_move_mouse(x, y, speed=speed)

    elif action == "type":
        text = params.get("text")
        if text:
            # Type with slight random delays
            pyautogui.write(text, interval=0.05)
            
    elif action == "keypress":
        key = params.get("key")
        modifiers = params.get("modifiers", [])
        if key:
            if modifiers:
                pyautogui.hotkey(*modifiers, key)
            else:
                pyautogui.press(key)
                
    elif action == "scroll":
        clicks = params.get("clicks", 0)
        pyautogui.scroll(clicks)
        
    elif action == "open":
        app_name = params.get("app_name")
        if app_name:
            open_application(app_name)
