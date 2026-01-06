import atomacos
from AppKit import NSWorkspace
import time

def debug_frontmost():
    print("--- Frontmost App Debugger ---")
    
    # 1. Atomacos
    try:
        atom_app = atomacos.getFrontmostApp()
        print(f"Atomacos says: {atom_app} (PID: {atom_app.pid})")
        print(f"  Bundle ID: {getattr(atom_app, 'bundle_identifier', 'Unknown')}")
    except Exception as e:
        print(f"Atomacos failed: {e}")

    # 2. NSWorkspace
    try:
        ws = NSWorkspace.sharedWorkspace()
        ns_app = ws.frontmostApplication()
        print(f"NSWorkspace says: {ns_app.localizedName()} (PID: {ns_app.processIdentifier()})")
        print(f"  Bundle ID: {ns_app.bundleIdentifier()}")
    except Exception as e:
        print(f"NSWorkspace failed: {e}")

if __name__ == "__main__":
    print("Switch to an app (e.g. Finder or Chrome) in 3 seconds...")
    time.sleep(3)
    debug_frontmost()
