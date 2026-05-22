import os
import re
import sys
import json
import time
import asyncio
import logging
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.llm_service import llm_service
from services.pc_control import pc_control_service
from services.voice_service import voice_service
from services.vision_service import vision_service
from services.memory_service import memory_service
from services.mobile_service import mobile_service
from services.automation_service import automation_service
from agents.registry import agent_registry

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("jarvis")

app = FastAPI(title="JARVIS AI OS Backend", version="2.0.0")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_connections = set()
start_time = time.time()

# Request schemas
class CommandRequest(BaseModel):
    command: str

class SpeakRequest(BaseModel):
    text: str

class OpenWebsiteRequest(BaseModel):
    url: str

class BrowserAutomateRequest(BaseModel):
    action: str
    url: str = None
    text: str = None
    x: int = None
    y: int = None

class FileCommandRequest(BaseModel):
    command: str

class SpotifyPlayRequest(BaseModel):
    query: str

# Helper to explain agent selection
def format_agent_explanation(selected_agent_name: str, command: str) -> str:
    # Simulates advanced multi-agent collaboration explanation
    clean_cmd = command.lower()
    
    if selected_agent_name == "Prime":
        support = "FRIDAY and Pepper"
        reason = "it is a general query requiring conversational flow coordination"
    elif selected_agent_name == "Steve":
        support = "Sentinel and Oracle"
        reason = "it requested code edits or file system checks"
    elif selected_agent_name == "Gecko":
        support = "Stark and Athena"
        reason = "it involves stock market and crypto portfolio intelligence"
    elif selected_agent_name == "Sentinel":
        support = "Hulk and Jarvis Prime"
        reason = "it checks hardware performance metrics"
    elif selected_agent_name == "Vision":
        support = "Steve and Research"
        reason = "it requires screenshot scanning and visual OCR analysis"
    elif selected_agent_name == "Jerome":
        support = "Stark and FRIDAY"
        reason = "it requested media control or music lookup operations"
    elif selected_agent_name == "Friday":
        support = "Jarvis Prime and Athena"
        reason = "it is a conversational query needing daily planning"
    else:
        support = "Jarvis Prime and FRIDAY"
        reason = "it matched specialized agent characteristics"
        
    return f"{selected_agent_name} Agent handled this task because {reason}, with support from {support}."

# Real-time resource broadcasting loop
async def broadcast_stats_loop():
    import psutil
    while True:
        if active_connections:
            try:
                cpu = psutil.cpu_percent()
                ram = psutil.virtual_memory().percent
                disk = psutil.disk_usage('/').percent
                
                # Check battery
                bat_pct = 100
                if hasattr(psutil, "sensors_battery"):
                    bat = psutil.sensors_battery()
                    if bat:
                        bat_pct = bat.percent
                
                # Check mobile battery
                mob_battery = mobile_service.get_battery_info()
                
                stats_payload = {
                    "type": "stats",
                    "cpu": cpu,
                    "ram": ram,
                    "disk": disk,
                    "battery": f"{bat_pct}%",
                    "mobile_battery": mob_battery.get("level", "Disconnected"),
                    "uptime_seconds": int(time.time() - start_time),
                    "connections": len(active_connections),
                    "active_agents": 22
                }
                
                # Broadcast
                payload_str = json.dumps(stats_payload)
                for ws in list(active_connections):
                    try:
                        await ws.send_text(payload_str)
                    except Exception:
                        active_connections.remove(ws)
            except Exception as e:
                logger.warning(f"Error in resource broadcasting: {e}")
        await asyncio.sleep(2)

@app.on_event("startup")
async def on_startup():
    logger.info("[STARTUP] JARVIS FastAPI backend initialized successfully")
    asyncio.create_task(broadcast_stats_loop())

# --- REST ENDPOINTS ---

@app.get("/status")
def get_status():
    import psutil
    cpu = psutil.cpu_percent()
    ram = psutil.virtual_memory().percent
    return {
        "status": "online",
        "uptime": int(time.time() - start_time),
        "agents": 22,
        "cpu": f"{cpu}%",
        "ram": f"{ram}%",
        "platform": sys.platform
    }

@app.get("/agents")
def get_agents():
    # Return lists of all registered agents and their description
    return [
        {
            "name": agent.name,
            "description": agent.description,
            "status": agent.get_status()
        }
        for agent in agent_registry.agents.values()
    ]

@app.get("/history")
def get_history():
    return memory_service.get_conversation_history(30)

@app.post("/command")
async def execute_command(req: CommandRequest):
    raw_cmd = req.command.strip()
    if not raw_cmd:
        raise HTTPException(status_code=400, detail="command is required")

    # Filter through voice service wake word & translation
    cmd = voice_service.filter_command(raw_cmd)
    if not cmd:
        return {"received": raw_cmd, "agent": "JARVIS", "response": "", "explanation": "Dormant mode check."}
    
    if cmd == "STANDBY_MODE":
        return {"received": raw_cmd, "agent": "JARVIS", "response": "Standing by.", "explanation": "Standby triggered."}
    if cmd == "WAKE_WORD_DETECTED":
        return {"received": raw_cmd, "agent": "JARVIS", "response": "Yes? I'm listening.", "explanation": "Awake triggered."}

    agent_name = "JARVIS"
    response_text = ""

    # Check built-in controls (volume, brightness, screenshot, power)
    pc_result = await asyncio.to_thread(pc_control_service.process_file_command, cmd)
    if pc_result:
        response_text = pc_result
        agent_name = "Steve"  # Steve processes file modifications
    else:
        # Check system controls
        if "screenshot" in cmd.lower():
            response_text = await asyncio.to_thread(pc_control_service.take_screenshot)
            agent_name = "Sentinel"
        elif "volume" in cmd.lower() or "mute" in cmd.lower():
            response_text = await asyncio.to_thread(pc_control_service.control_volume, cmd)
            agent_name = "Sentinel"
        elif "brightness" in cmd.lower():
            response_text = await asyncio.to_thread(pc_control_service.control_brightness, cmd)
            agent_name = "Sentinel"
        elif "shutdown" in cmd.lower() or "restart" in cmd.lower() or "sleep" in cmd.lower():
            response_text = await asyncio.to_thread(pc_control_service.system_control, cmd)
            agent_name = "Sentinel"
        elif "mirror" in cmd.lower() or "scrcpy" in cmd.lower():
            response_text = await asyncio.to_thread(mobile_service.start_mirroring)
            agent_name = "Veronica"

    # App launcher / open command
    if not response_text:
        open_match = re.match(r'^(?:open|launch|start)\s+(.+)$', cmd, re.IGNORECASE)
        if open_match:
            app_target = open_match.group(1).strip()
            # Check if it's a URL/website
            url_match = re.match(r'^(?:website\s+|site\s+|url\s+)?(.+\.(?:com|org|net|io|ai|dev|app|co|uk|in|tv|me|gov|edu|info|tech|xyz|gg|to|cc|biz|us|eu)(?:\/.*)?|https?://.+)$', app_target, re.IGNORECASE)
            yt_check = pc_control_service._parse_youtube_command(cmd)
            spotify_check = pc_control_service._parse_spotify_command(cmd)
            if yt_check:
                response_text = pc_control_service.play_on_youtube(yt_check)
                agent_name = "Jerome"
            elif spotify_check:
                response_text = await asyncio.to_thread(pc_control_service.play_on_spotify, spotify_check)
                agent_name = "Jerome"
            elif url_match:
                response_text = pc_control_service.open_website(app_target)
                agent_name = "Sentinel"
            else:
                response_text = pc_control_service.launch_app(app_target)
                agent_name = "Sentinel"

    # Open website command ("go to", "navigate to", "visit")
    if not response_text:
        goto_match = re.match(r'^(?:go\s+to|navigate\s+to|visit|browse\s+to)\s+(.+)$', cmd, re.IGNORECASE)
        if goto_match:
            url = goto_match.group(1).strip()
            response_text = pc_control_service.open_website(url)
            agent_name = "Sentinel"

    # Close/quit app
    if not response_text:
        close_match = re.match(r'^(?:close|quit|exit|kill)\s+(.+)$', cmd, re.IGNORECASE)
        if close_match:
            response_text = pc_control_service.close_app(close_match.group(1).strip())
            agent_name = "Sentinel"

    # Play command -> smart routing (Spotify vs YouTube)
    if not response_text:
        play_match = re.match(r'^play\s+(.+?)(?:\s+on\s+(youtube|spotify))?$', cmd, re.IGNORECASE)
        if play_match:
            query = play_match.group(1).strip()
            platform = (play_match.group(2) or "").lower()
            if platform == "spotify":
                response_text = await asyncio.to_thread(pc_control_service.play_on_spotify, query)
                agent_name = "Jerome"
            else:
                # Default: YouTube (backwards compat)
                response_text = pc_control_service.play_on_youtube(query)
                agent_name = "Jerome"

    # Browser automation commands
    if not response_text:
        scroll_m = re.match(r'^scroll\s+(down|up)$', cmd, re.IGNORECASE)
        if scroll_m:
            direction = scroll_m.group(1).lower()
            response_text = pc_control_service.browser_automate(f"scroll_{direction}")
            agent_name = "Sentinel"

    if not response_text:
        if re.match(r'^(?:browser\s+)?(?:go\s+)?back$', cmd, re.IGNORECASE):
            response_text = pc_control_service.browser_automate("go_back")
            agent_name = "Sentinel"
        elif re.match(r'^(?:browser\s+)?(?:go\s+)?forward$', cmd, re.IGNORECASE):
            response_text = pc_control_service.browser_automate("go_forward")
            agent_name = "Sentinel"
        elif re.match(r'^(?:browser\s+)?refresh$', cmd, re.IGNORECASE):
            response_text = pc_control_service.browser_automate("refresh")
            agent_name = "Sentinel"
        elif re.match(r'^(?:open\s+)?new\s+tab$', cmd, re.IGNORECASE):
            response_text = pc_control_service.browser_automate("new_tab")
            agent_name = "Sentinel"
        elif re.match(r'^close\s+tab$', cmd, re.IGNORECASE):
            response_text = pc_control_service.browser_automate("close_tab")
            agent_name = "Sentinel"

    # Website builder
    if not response_text and "website" in cmd.lower() and "create" in cmd.lower():
        folder_match = cmd.replace("create a website called", "").replace("build a website", "").strip()
        response_text = await asyncio.to_thread(pc_control_service.build_website, folder_match, cmd)
        agent_name = "Steve"

    # Specialized agent routing
    if not response_text:
        selected_agent = agent_registry.select_agent_for_command(cmd)
        response_text = await selected_agent.process(cmd)
        agent_name = selected_agent.name

    # Add explanation of multi-agent selection
    explanation = format_agent_explanation(agent_name, cmd)
    full_response = f"{response_text}\n\n*({explanation})*"

    # Save to SQLite Memory
    memory_service.add_conversation(cmd, full_response, agent_name)

    # Speak response asynchronously
    voice_service.speak(response_text)

    return {
        "received": cmd,
        "agent": agent_name,
        "response": full_response,
        "explanation": explanation
    }

@app.post("/speak")
def speak(req: SpeakRequest):
    voice_service.speak(req.text)
    return {"status": "speaking"}

# --- WEBSITE / BROWSER ENDPOINTS ---

@app.post("/browser/open")
def open_website_endpoint(req: OpenWebsiteRequest):
    """Open any URL/domain in the default browser."""
    result = pc_control_service.open_website(req.url)
    return {"status": "ok", "result": result, "url": req.url}

@app.post("/browser/automate")
def browser_automate_endpoint(req: BrowserAutomateRequest):
    """Automate browser actions (click, scroll, type, navigate, etc.)"""
    result = pc_control_service.browser_automate(
        action=req.action,
        url=req.url,
        text=req.text,
        x=req.x,
        y=req.y
    )
    return {"status": "ok", "action": req.action, "result": result}

@app.get("/browser/actions")
def get_browser_actions():
    """List all available browser automation actions."""
    return {
        "actions": [
            {"action": "open_url",        "params": ["url"],        "desc": "Navigate to URL"},
            {"action": "click",           "params": ["x", "y"],     "desc": "Click at coordinates"},
            {"action": "type_text",       "params": ["text"],       "desc": "Type text"},
            {"action": "scroll_down",     "params": [],             "desc": "Scroll page down"},
            {"action": "scroll_up",       "params": [],             "desc": "Scroll page up"},
            {"action": "go_back",         "params": [],             "desc": "Browser back"},
            {"action": "go_forward",      "params": [],             "desc": "Browser forward"},
            {"action": "refresh",         "params": [],             "desc": "Reload page"},
            {"action": "new_tab",         "params": [],             "desc": "Open new tab"},
            {"action": "close_tab",       "params": [],             "desc": "Close current tab"},
            {"action": "zoom_in",         "params": [],             "desc": "Zoom in"},
            {"action": "zoom_out",        "params": [],             "desc": "Zoom out"},
            {"action": "find_in_page",    "params": ["text"],       "desc": "Find text on page"},
            {"action": "focus_address_bar", "params": [],           "desc": "Focus address bar"},
            {"action": "select_all",      "params": [],             "desc": "Select all"},
            {"action": "copy",            "params": [],             "desc": "Copy selection"},
            {"action": "paste",           "params": [],             "desc": "Paste clipboard"},
            {"action": "save_page",       "params": [],             "desc": "Save page"},
            {"action": "devtools",        "params": [],             "desc": "Open DevTools (F12)"},
        ]
    }

# --- FILE MANAGEMENT ENDPOINT ---

@app.post("/files/command")
def file_command_endpoint(req: FileCommandRequest):
    """Execute natural language file management commands (move, copy, organize, delete, etc.)"""
    result = pc_control_service.process_file_command(req.command)
    if result:
        return {"status": "ok", "result": result, "command": req.command}
    return {"status": "error", "message": "Command not recognized as a file operation."}

# --- SPOTIFY ENDPOINT ---

@app.post("/spotify/play")
def spotify_play_endpoint(req: SpotifyPlayRequest):
    """Launch Spotify and auto-play a song."""
    result = pc_control_service.play_on_spotify(req.query)
    return {"status": "ok", "query": req.query, "result": result}

@app.post("/spotify/control")
def spotify_control_endpoint(action: str):
    """
    Control Spotify playback: play, pause, next, previous, volume_up, volume_down.
    Uses media key automation via pyautogui.
    """
    try:
        import pyautogui
        action = action.lower().strip()
        if action == "pause" or action == "play":
            pyautogui.press('playpause')
            return {"status": "ok", "result": f"⏯️ Spotify: toggled play/pause"}
        elif action == "next":
            pyautogui.press('nexttrack')
            return {"status": "ok", "result": "⏭️ Spotify: next track"}
        elif action == "previous":
            pyautogui.press('prevtrack')
            return {"status": "ok", "result": "⏮️ Spotify: previous track"}
        elif action == "volume_up":
            for _ in range(3): pyautogui.press('volumeup')
            return {"status": "ok", "result": "🔊 Volume increased"}
        elif action == "volume_down":
            for _ in range(3): pyautogui.press('volumedown')
            return {"status": "ok", "result": "🔉 Volume decreased"}
        else:
            return {"status": "error", "result": f"Unknown action: {action}"}
    except Exception as e:
        return {"status": "error", "result": str(e)}

@app.get("/memory/stats")
def get_memory_stats():
    # Count rows in SQLite tables
    try:
        import sqlite3
        conn = sqlite3.connect(memory_service.db_path)
        c = conn.cursor()
        c.execute("SELECT count(*) FROM conversations")
        conv_count = c.fetchone()[0]
        c.execute("SELECT count(*) FROM activities")
        act_count = c.fetchone()[0]
        c.execute("SELECT count(*) FROM preferences")
        pref_count = c.fetchone()[0]
        conn.close()
        return {
            "conversations": conv_count,
            "activities": act_count,
            "preferences": pref_count
        }
    except Exception:
        return {"conversations": 0, "activities": 0, "preferences": 0}

class RoutineRequest(BaseModel):
    name: str
    trigger_type: str
    trigger_value: str
    action: str

class FutureTechRequest(BaseModel):
    device: str
    action: str
    value: int = 0

@app.get("/automation/routines")
def get_routines():
    return automation_service.get_routines()

@app.post("/automation/routines/add")
def add_routine(req: RoutineRequest):
    return automation_service.add_routine(req.name, req.trigger_type, req.trigger_value, req.action)

@app.post("/automation/routines/remove/{routine_id}")
def remove_routine(routine_id: str):
    success = automation_service.remove_routine(routine_id)
    return {"success": success}

@app.get("/security/diagnostics")
async def get_security_diagnostics():
    ultron = agent_registry.get_agent("ultron")
    res = await ultron.execute("scan ports security processes")
    return {"report": res}

@app.post("/future/control")
def future_control(req: FutureTechRequest):
    logger.info(f"[FutureTech] Device {req.device} triggered: {req.action} to {req.value}")
    return {
        "success": True,
        "message": f"Stark Satellite Link command: {req.device} {req.action} set to {req.value}",
        "timestamp": datetime.now().isoformat()
    }


# --- WEBSOCKET CHANNEL ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    logger.info(f"[WS] Client Connected. Total connections: {len(active_connections)}")
    
    # Send welcome packet
    welcome_payload = {
        "type": "welcome",
        "message": "JARVIS core intelligence link established.",
        "uptime": int(time.time() - start_time),
        "platform": sys.platform
    }
    await websocket.send_text(json.dumps(welcome_payload))

    try:
        while True:
            data = await websocket.receive_text()
            packet = json.loads(data)
            
            if packet.get("type") == "command":
                raw_cmd = packet.get("text", "").strip()
                if raw_cmd:
                    # Echo command to client
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        "status": "processing",
                        "command": raw_cmd
                    }))
                    
                    # Process command
                    cmd = voice_service.filter_command(raw_cmd)
                    if cmd == "STANDBY_MODE":
                        await websocket.send_text(json.dumps({
                            "type": "response",
                            "agent": "JARVIS",
                            "response": "Standing by.",
                            "explanation": "Standby triggered."
                        }))
                        continue
                    if cmd == "WAKE_WORD_DETECTED":
                        await websocket.send_text(json.dumps({
                            "type": "response",
                            "agent": "JARVIS",
                            "response": "Yes? I'm listening.",
                            "explanation": "Wake word triggered."
                        }))
                        continue
                    if not cmd:
                        continue
                    
                    agent_name = "JARVIS"
                    response_text = ""

                    # Run automation checks
                    pc_result = await asyncio.to_thread(pc_control_service.process_file_command, cmd)
                    if pc_result:
                        response_text = pc_result
                        agent_name = "Steve"
                    else:
                        if "screenshot" in cmd.lower():
                            response_text = await asyncio.to_thread(pc_control_service.take_screenshot)
                            agent_name = "Sentinel"
                        elif "volume" in cmd.lower() or "mute" in cmd.lower():
                            response_text = await asyncio.to_thread(pc_control_service.control_volume, cmd)
                            agent_name = "Sentinel"
                        elif "brightness" in cmd.lower():
                            response_text = await asyncio.to_thread(pc_control_service.control_brightness, cmd)
                            agent_name = "Sentinel"
                        elif "shutdown" in cmd.lower() or "restart" in cmd.lower() or "sleep" in cmd.lower():
                            response_text = await asyncio.to_thread(pc_control_service.system_control, cmd)
                            agent_name = "Sentinel"
                        elif "mirror" in cmd.lower() or "scrcpy" in cmd.lower():
                            response_text = await asyncio.to_thread(mobile_service.start_mirroring)
                            agent_name = "Veronica"
                            
                    # App launcher / open command
                    if not response_text:
                        open_match = re.match(r'^(?:open|launch|start)\s+(.+)$', cmd, re.IGNORECASE)
                        if open_match:
                            app_target = open_match.group(1).strip()
                            url_match = re.match(r'^(?:website\s+|site\s+|url\s+)?(.+\.(?:com|org|net|io|ai|dev|app|co|uk|in|tv|me|gov|edu|info|tech|xyz|gg|to|cc|biz|us|eu)(?:\/.*)?|https?://.+)$', app_target, re.IGNORECASE)
                            yt_check = pc_control_service._parse_youtube_command(cmd)
                            spotify_check = pc_control_service._parse_spotify_command(cmd)
                            if yt_check:
                                response_text = pc_control_service.play_on_youtube(yt_check)
                                agent_name = "Jerome"
                            elif spotify_check:
                                response_text = await asyncio.to_thread(pc_control_service.play_on_spotify, spotify_check)
                                agent_name = "Jerome"
                            elif url_match:
                                response_text = pc_control_service.open_website(app_target)
                                agent_name = "Sentinel"
                            else:
                                response_text = pc_control_service.launch_app(app_target)
                                agent_name = "Sentinel"

                    # Open website ("go to", "navigate", "visit")
                    if not response_text:
                        goto_match = re.match(r'^(?:go\s+to|navigate\s+to|visit|browse\s+to)\s+(.+)$', cmd, re.IGNORECASE)
                        if goto_match:
                            url = goto_match.group(1).strip()
                            response_text = pc_control_service.open_website(url)
                            agent_name = "Sentinel"

                    # Close/quit app
                    if not response_text:
                        close_match = re.match(r'^(?:close|quit|exit|kill)\s+(.+)$', cmd, re.IGNORECASE)
                        if close_match:
                            response_text = pc_control_service.close_app(close_match.group(1).strip())
                            agent_name = "Sentinel"

                    # Play command -> smart routing (Spotify vs YouTube)
                    if not response_text:
                        play_match = re.match(r'^play\s+(.+?)(?:\s+on\s+(youtube|spotify))?$', cmd, re.IGNORECASE)
                        if play_match:
                            query = play_match.group(1).strip()
                            platform = (play_match.group(2) or "").lower()
                            if platform == "spotify":
                                response_text = await asyncio.to_thread(pc_control_service.play_on_spotify, query)
                                agent_name = "Jerome"
                            else:
                                response_text = pc_control_service.play_on_youtube(query)
                                agent_name = "Jerome"

                    # Browser automation shortcut commands
                    if not response_text:
                        scroll_m = re.match(r'^scroll\s+(down|up)$', cmd, re.IGNORECASE)
                        if scroll_m:
                            direction = scroll_m.group(1).lower()
                            response_text = pc_control_service.browser_automate(f"scroll_{direction}")
                            agent_name = "Sentinel"

                    if not response_text:
                        if re.match(r'^(?:browser\s+)?(?:go\s+)?back$', cmd, re.IGNORECASE):
                            response_text = pc_control_service.browser_automate("go_back")
                            agent_name = "Sentinel"
                        elif re.match(r'^(?:browser\s+)?(?:go\s+)?forward$', cmd, re.IGNORECASE):
                            response_text = pc_control_service.browser_automate("go_forward")
                            agent_name = "Sentinel"
                        elif re.match(r'^(?:browser\s+)?refresh$', cmd, re.IGNORECASE):
                            response_text = pc_control_service.browser_automate("refresh")
                            agent_name = "Sentinel"
                        elif re.match(r'^(?:open\s+)?new\s+tab$', cmd, re.IGNORECASE):
                            response_text = pc_control_service.browser_automate("new_tab")
                            agent_name = "Sentinel"
                        elif re.match(r'^close\s+tab$', cmd, re.IGNORECASE):
                            response_text = pc_control_service.browser_automate("close_tab")
                            agent_name = "Sentinel"

                    # Website builder check
                    if not response_text and "website" in cmd.lower() and "create" in cmd.lower():
                        folder_match = cmd.replace("create a website called", "").replace("build a website", "").strip()
                        response_text = await asyncio.to_thread(pc_control_service.build_website, folder_match, cmd)
                        agent_name = "Steve"

                    # Specialized agent routing fallback
                    if not response_text:
                        selected_agent = agent_registry.select_agent_for_command(cmd)
                        response_text = await selected_agent.process(cmd)
                        agent_name = selected_agent.name

                    # Explanation formatting
                    explanation = format_agent_explanation(agent_name, cmd)
                    full_response = f"{response_text}\n\n*({explanation})*"

                    # Save to Memory
                    memory_service.add_conversation(cmd, full_response, agent_name)

                    # Speak response
                    voice_service.speak(response_text)

                    # Send back packet
                    await websocket.send_text(json.dumps({
                        "type": "response",
                        "agent": agent_name,
                        "response": full_response,
                        "explanation": explanation
                    }))
                    
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        logger.info(f"[WS] Client Disconnected. Total connections: {len(active_connections)}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
