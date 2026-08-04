import asyncio
import json
import os
import sys
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from process_tracker import (
    get_running_ai_processes, 
    kill_ai_process, 
    get_system_telemetry,
    get_hardware_info,
    auto_kill_rogue_processes
)
from log_monitor import (
    scan_ai_sessions, 
    get_session_transcript_logs, 
    scan_all_prompts,
    search_all_transcripts,
    get_token_analytics
)
from prompt_tracker import (
    init_db, 
    get_prompts_list, 
    toggle_favorite_prompt, 
    get_prompt_analytics
)
from commander_service import (
    run_ai_command, 
    get_commander_tasks,
    send_macos_notification
)

app = FastAPI(
    title="AI Commander REST API",
    description="Backend API for tracking AI tasks, prompts, hardware stats, and log streams",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

class CommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "AI Commander Backend REST API",
        "version": "1.1.0"
    }

# --- Telemetry, Hardware & Process Endpoints ---

@app.get("/api/system/stats")
def get_system_stats():
    return get_system_telemetry()

@app.get("/api/hardware")
def get_hardware():
    return get_hardware_info()

@app.get("/api/processes")
def list_processes(all: bool = Query(False, description="Include all system processes if True")):
    procs = get_running_ai_processes(all)
    high_resource_count = sum(1 for p in procs if p.get("is_high_resource"))
    return {
        "count": len(procs),
        "high_resource_count": high_resource_count,
        "processes": procs
    }

@app.post("/api/processes/{pid}/kill")
def kill_process(pid: int):
    res = kill_ai_process(pid)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@app.post("/api/watchdog/autokill")
def watchdog_autokill(threshold: float = Query(85.0, ge=50.0, le=100.0)):
    """Auto-kill rogue AI processes using > threshold % CPU."""
    return auto_kill_rogue_processes(cpu_threshold=threshold)

# --- Log Search & Analytics Endpoints ---

@app.get("/api/sessions")
def list_sessions():
    sessions = scan_ai_sessions()
    return {
        "count": len(sessions),
        "sessions": sessions
    }

@app.get("/api/sessions/{session_id}/logs")
def get_session_logs(session_id: str, limit: int = Query(500, ge=1, le=2000)):
    data = get_session_transcript_logs(session_id, limit=limit)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data

@app.get("/api/logs/search")
def search_logs(q: str = Query(..., description="Query keyword to search across all session transcripts")):
    results = search_all_transcripts(q)
    return {
        "query": q,
        "count": len(results),
        "results": results
    }

@app.get("/api/analytics/tokens")
def token_analytics():
    return get_token_analytics()

# --- Prompts Endpoints ---

@app.get("/api/prompts")
def list_prompts(
    search: str = Query("", description="Search text in prompt"),
    category: str = Query("", description="Filter category"),
    favorite_only: bool = Query(False, description="Filter favorites"),
    limit: int = Query(100, ge=1, le=500)
):
    prompts = get_prompts_list(search=search, category=category, favorite_only=favorite_only, limit=limit)
    return {
        "count": len(prompts),
        "prompts": prompts
    }

@app.post("/api/prompts/{prompt_id}/favorite")
def favorite_prompt(prompt_id: int):
    return toggle_favorite_prompt(prompt_id)

@app.get("/api/prompts/analytics")
def prompt_analytics():
    return get_prompt_analytics()

# --- Commander Action Endpoints ---

@app.post("/api/commander/run")
def execute_command(req: CommandRequest):
    if not req.command.strip():
        raise HTTPException(status_code=400, detail="Command string cannot be empty")
    return run_ai_command(req.command, req.cwd)

@app.get("/api/commander/tasks")
def list_commander_tasks():
    return {
        "tasks": get_commander_tasks()
    }

# --- WebSocket for Real-time Streaming ---

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            telemetry = get_system_telemetry()
            ai_procs = get_running_ai_processes(all_processes=False)
            sessions = scan_ai_sessions()
            tokens_info = get_token_analytics()
            payload = {
                "telemetry": telemetry,
                "active_ai_processes": len(ai_procs),
                "high_resource_procs": sum(1 for p in ai_procs if p.get("is_high_resource")),
                "top_processes": ai_procs[:10],
                "active_sessions_count": len(sessions),
                "total_tokens": tokens_info["total_tokens"],
                "estimated_api_cost": tokens_info["estimated_api_cost_dollars"]
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
