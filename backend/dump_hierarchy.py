#!/usr/bin/env python3
import atomacos
from AppKit import NSWorkspace
import sys
import time

print("Starting in 5 seconds... Switch to the app you want to test!")
time.sleep(5)

# Get frontmost app
ns_app = NSWorkspace.sharedWorkspace().frontmostApplication()
pid = ns_app.processIdentifier()
print(f"Active app: {ns_app.localizedName()} (PID: {pid})")

app = atomacos.getAppRefByPid(pid)
windows = app.windows()

print(f"Found {len(windows)} windows")

def dump_node(node, depth=0, max_depth=10):
    indent = "  " * depth
    try:
        role = getattr(node, 'AXRole', '?')
        title = getattr(node, 'AXTitle', '')
        desc = getattr(node, 'AXDescription', '')
        pos = getattr(node, 'AXPosition', None)
        size = getattr(node, 'AXSize', None)
        
        name = title or desc or ""
        # Clean up name for printing
        name = name.replace('\n', ' ')[:50]
        
        print(f"{indent}[{role}] '{name}' pos={pos} size={size}")
        
        if depth < max_depth:
            children = node.AXChildren
            for child in children:
                dump_node(child, depth + 1, max_depth)
    except Exception as e:
        print(f"{indent}Error: {e}")

if len(windows) > 0:
    # Dump the main window (usually the largest one or the one with content)
    # We'll dump the last one as it seemed to be the main one in previous outputs
    target_window = windows[-1] 
    print(f"\nDumping structure of Window: {target_window.AXTitle}")
    dump_node(target_window)
else:
    print("No windows found")
