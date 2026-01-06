import os
import json
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import automation
import io
import pyautogui
import base64
import time
import random
import asyncio
from PIL import Image

# Configure Gemini
# NOTE: You need to set GOOGLE_API_KEY environment variable
GOOGLE_API_KEY = "AIzaSyCxm4MLjlP4_GdPEi1JuOGW7tgm4mlf3ng" # Replace with your actual key if different
genai.configure(api_key=GOOGLE_API_KEY)

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

class AgentRequest(BaseModel):
    prompt: str
    image: Optional[str] = None # Base64 encoded image

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

SYSTEM_INSTRUCTION = """
You are a desktop automation agent. You control the computer to fulfill the user's request.
You have access to the Accessibility Tree of the active window and a screenshot of the screen.

Your goal is to return a JSON list of actions to execute.

Available Actions:
- {"action": "click", "params": {"x": int, "y": int}} -> Click at coordinates. Use the 'position' and 'size' from the UI tree to calculate the center (x + w/2, y + h/2).
- {"action": "double_click", "params": {"x": int, "y": int}} -> Double click at coordinates.
- {"action": "right_click", "params": {"x": int, "y": int}} -> Right click at coordinates.
- {"action": "drag", "params": {"start_x": int, "start_y": int, "end_x": int, "end_y": int}} -> Drag from start to end.
- {"action": "type", "params": {"text": "string"}} -> Type text.
- {"action": "keypress", "params": {"key": "string", "modifiers": ["cmd", "ctrl", "shift"]}} -> Press a key.
- {"action": "open", "params": {"app_name": "string"}} -> Open an app (e.g., "Safari", "Zoom").
- {"action": "scroll", "params": {"clicks": int}} -> Scroll (positive = up, negative = down).

Rules:
1. Analyze the UI Tree and Screenshot to find the element the user wants to interact with.
2. Calculate the center coordinates for clicks.
3. If the user wants to open an app, use the "open" action.
4. Return ONLY valid JSON. No markdown formatting.
"""

@app.post("/agent")
async def agent_command(request: AgentRequest):
    """
    Handles natural language commands using Gemini with Vision.
    """
    try:
        # 1. Get UI Context
        ui_tree = automation.get_accessibility_tree()
        
        # 2. Get Screenshot (if not provided in request, take one)
        img_data = None
        if request.image:
            try:
                img_bytes = base64.b64decode(request.image)
                img_data = Image.open(io.BytesIO(img_bytes))
            except:
                pass
        
        if img_data is None:
            screenshot = pyautogui.screenshot()
            if screenshot.mode == 'RGBA':
                screenshot = screenshot.convert('RGB')
            img_data = screenshot

        # 3. Construct Prompt
        # Use the requested model
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        prompt_parts = [
            SYSTEM_INSTRUCTION,
            f"User Request: \"{request.prompt}\"",
            f"Current UI Tree (Active Window):\n{json.dumps(ui_tree, indent=2)}",
            "Generate the JSON plan.",
            img_data
        ]
        
        # 4. Call Gemini with retry logic
        max_retries = 3
        retry_delay = 2

        response = None
        for attempt in range(max_retries):
            try:
                response = model.generate_content(prompt_parts)
                break
            except Exception as e:
                print(f"Gemini Error (Attempt {attempt+1}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    raise e
        
        # 5. Parse and Execute
        try:
            text = response.text.strip()
            # Remove markdown code blocks if present
            if text.startswith("```json"):
                text = text[7:-3]
            elif text.startswith("```"):
                text = text[3:-3]
                
            actions = json.loads(text)
            if isinstance(actions, dict):
                actions = [actions]
            
            results = []
            for action in actions:
                automation.perform_action(action["action"], action.get("params"))
                results.append(f"Executed {action['action']}")
                
            return {"status": "success", "actions": results}
            
        except json.JSONDecodeError:
            return {"status": "error", "message": "Failed to parse Gemini response", "raw": response.text}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive data from client (JSON with audio/text/command)
            data = await websocket.receive_json()
            
            command = data.get("command")
            audio_data = data.get("audio") # Base64 encoded audio if we were doing audio processing here
            
            if command:
                # 1. Capture State
                ui_tree = automation.get_accessibility_tree()
                screenshot = pyautogui.screenshot()
                if screenshot.mode == 'RGBA':
                    screenshot = screenshot.convert('RGB')
                
                # 2. Call Gemini (Streaming)
                model = genai.GenerativeModel('gemini-2.5-flash-lite')
                
                prompt_parts = [
                    SYSTEM_INSTRUCTION,
                    f"User Request: \"{command}\"",
                    f"Current UI Tree (Active Window):\n{json.dumps(ui_tree, indent=2)}",
                    screenshot
                ]
                
                response = model.generate_content(prompt_parts, stream=True)
                
                full_text = ""
                for chunk in response:
                    if chunk.text:
                        full_text += chunk.text
                        # Send partial text back to client for "streaming" effect
                        await websocket.send_json({"type": "stream", "content": chunk.text})
                
                # 3. Parse and Execute (once full response is ready)
                # Note: For true streaming execution, we'd need a model that outputs actions token-by-token or line-by-line.
                # For now, we accumulate and execute.
                try:
                    text = full_text.strip()
                    if text.startswith("```json"):
                        text = text[7:-3]
                    elif text.startswith("```"):
                        text = text[3:-3]
                    
                    actions = json.loads(text)
                    if isinstance(actions, dict):
                        actions = [actions]
                        
                    for action in actions:
                        automation.perform_action(action["action"], action.get("params"))
                        await websocket.send_json({"type": "log", "content": f"Executed {action['action']}"})
                        
                    await websocket.send_json({"type": "done", "status": "success"})
                    
                except Exception as e:
                     await websocket.send_json({"type": "error", "content": f"Execution error: {str(e)}"})

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
