import atomacos
import time
import sys
import os

def check_accessibility():
    print("--- Accessibility Debugger ---")
    
    print("--- Accessibility Debugger ---")
    
    # Check Trust Status (Simplified)
    # If we can't see windows, we are likely not trusted.
    
    try:
        # 1. Check Frontmost App
        print("Attempting to get frontmost app...")
        app = atomacos.getFrontmostApp()
        print(f"Frontmost App: {app}")
        print(f"  PID: {app.pid}")
        
        # 2. Check Finder explicitly
        print("\nAttempting to access Finder...")
        finder = atomacos.getAppRefByBundleId("com.apple.finder")
        print(f"Finder App: {finder}")
        if finder:
            windows = finder.windows()
            print(f"  Finder Window Count: {len(windows)}")
            for i, w in enumerate(windows):
                print(f"  Finder Window {i}: {w.AXTitle}")
        else:
            print("  Could not find Finder app ref.")

    except Exception as e:
        print(f"\n[ERROR] Accessibility check failed: {e}")
        print("\nPOSSIBLE CAUSES:")
        print("1. Accessibility Permissions are missing.")
        print("   Go to System Settings -> Privacy & Security -> Accessibility.")
        print("   Ensure your Terminal (or VS Code/Python) is checked.")
        print("2. The application does not support Accessibility API.")

if __name__ == "__main__":
    # Give user time to switch focus if needed
    print("You have 3 seconds to switch to the target app (if not Terminal)...")
    time.sleep(3)
    check_accessibility()
