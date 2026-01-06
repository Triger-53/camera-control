import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import automation
import io
import pyautogui
import base64

# Load environment variables
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ActionRequest(BaseModel):
    action: str
    params: Optional[Dict[str, Any]] = None

@app.get("/screenshot")
async def get_screenshot():
    """Returns a base64 encoded screenshot."""
    try:
        screenshot = pyautogui.screenshot()
        if screenshot.mode == 'RGBA':
            screenshot = screenshot.convert('RGB')
        buffered = io.BytesIO()
        screenshot.save(buffered, format="JPEG", quality=50)
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return {"image": img_str}
    except Exception as e:
        print(f"Screenshot error: {e}")
        raise HTTPException(status_code=500, detail=f"Screenshot failed: {str(e)}")

@app.get("/ui-tree")
async def get_ui_tree():
    """Returns the accessibility tree of the active window."""
    print("DEBUG: /ui-tree requested")
    tree = automation.get_accessibility_tree()
    # Return compact JSON (no pretty printing)
    return Response(content=json.dumps(tree, separators=(',', ':')), media_type="application/json")

@app.post("/execute")
async def execute_action(request: ActionRequest):
    """Executes a low-level command."""
    try:
        automation.perform_action(request.action, request.params)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
