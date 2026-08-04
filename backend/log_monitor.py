import os
import json
import glob
from pathlib import Path
from typing import List, Dict, Any, Optional

HOME_DIR = str(Path.home())
GEMINI_BRAIN_DIR = os.path.join(HOME_DIR, ".gemini", "antigravity-cli", "brain")

def scan_ai_sessions() -> List[Dict[str, Any]]:
    """Scan all session directories in ~/.gemini/antigravity-cli/brain/ and return summaries."""
    sessions = []
    if not os.path.exists(GEMINI_BRAIN_DIR):
        return []

    for item in os.listdir(GEMINI_BRAIN_DIR):
        session_path = os.path.join(GEMINI_BRAIN_DIR, item)
        if not os.path.isdir(session_path):
            continue
            
        logs_dir = os.path.join(session_path, ".system_generated", "logs")
        transcript_file = os.path.join(logs_dir, "transcript.jsonl")
        
        if not os.path.exists(transcript_file):
            continue
            
        # Parse basic metadata from transcript
        session_info = parse_session_metadata(item, session_path, transcript_file)
        sessions.append(session_info)
        
    sessions.sort(key=lambda s: s.get("last_updated", 0), reverse=True)
    return sessions

def parse_session_metadata(conversation_id: str, session_path: str, transcript_file: str) -> Dict[str, Any]:
    step_count = 0
    first_prompt = "No prompt recorded"
    latest_prompt = ""
    last_updated = os.path.getmtime(transcript_file)
    status = "completed"
    tool_calls_count = 0
    subagents_count = 0
    
    try:
        with open(transcript_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    step_count += 1
                    
                    step_type = data.get("type", "")
                    content = data.get("content", "")
                    
                    if step_type == "USER_INPUT" or data.get("source") == "USER_EXPLICIT":
                        if first_prompt == "No prompt recorded" and content:
                            first_prompt = content.strip()
                        if content:
                            latest_prompt = content.strip()
                            
                    tool_calls = data.get("tool_calls", [])
                    if tool_calls:
                        tool_calls_count += len(tool_calls)
                        for tc in tool_calls:
                            if tc.get("name") == "invoke_subagent":
                                subagents_count += 1
                                
                    if data.get("status") == "RUNNING":
                        status = "active"
                except Exception:
                    continue
    except Exception:
        pass
        
    return {
        "conversation_id": conversation_id,
        "path": session_path,
        "first_prompt": first_prompt[:180] + "..." if len(first_prompt) > 180 else first_prompt,
        "latest_prompt": latest_prompt[:180] + "..." if len(latest_prompt) > 180 else latest_prompt,
        "step_count": step_count,
        "tool_calls_count": tool_calls_count,
        "subagents_count": subagents_count,
        "last_updated": last_updated,
        "status": status
    }

def get_session_transcript_logs(conversation_id: str, limit: int = 200) -> Dict[str, Any]:
    session_path = os.path.join(GEMINI_BRAIN_DIR, conversation_id)
    logs_dir = os.path.join(session_path, ".system_generated", "logs")
    transcript_file = os.path.join(logs_dir, "transcript.jsonl")
    
    if not os.path.exists(transcript_file):
        return {"error": f"Transcript for session {conversation_id} not found."}
        
    steps = []
    user_prompts = []
    tool_history = []
    
    try:
        with open(transcript_file, 'r', encoding='utf-8', errors='ignore') as f:
            for line_no, line in enumerate(f, 1):
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    step_type = data.get("type", "STEP")
                    source = data.get("source", "")
                    content = data.get("content", "")
                    tool_calls = data.get("tool_calls", [])
                    
                    parsed_step = {
                        "line_no": line_no,
                        "step_index": data.get("step_index", line_no),
                        "type": step_type,
                        "source": source,
                        "content": content,
                        "tool_calls": tool_calls,
                        "is_truncated": data.get("is_truncated", False)
                    }
                    steps.append(parsed_step)
                    
                    if step_type == "USER_INPUT" or source == "USER_EXPLICIT":
                        if content and content.strip():
                            user_prompts.append({
                                "line_no": line_no,
                                "prompt": content.strip()
                            })
                            
                    if tool_calls:
                        for tc in tool_calls:
                            tool_history.append({
                                "line_no": line_no,
                                "name": tc.get("name"),
                                "summary": tc.get("summary", ""),
                                "args": tc.get("args", {})
                            })
                except Exception:
                    continue
    except Exception as e:
        return {"error": f"Failed reading transcript: {str(e)}"}
        
    return {
        "conversation_id": conversation_id,
        "total_steps": len(steps),
        "user_prompts": user_prompts,
        "tool_history": tool_history,
        "steps": steps[-limit:]
    }

def scan_all_prompts() -> List[Dict[str, Any]]:
    """Collect all prompts across all available sessions."""
    sessions = scan_ai_sessions()
    all_prompts = []
    
    for s in sessions:
        cid = s["conversation_id"]
        logs = get_session_transcript_logs(cid, limit=1000)
        prompts = logs.get("user_prompts", [])
        
        for p in prompts:
            prompt_text = p["prompt"]
            if not prompt_text:
                continue
            all_prompts.append({
                "conversation_id": cid,
                "timestamp": s["last_updated"],
                "prompt": prompt_text,
                "length": len(prompt_text),
                "source": "Antigravity Agent Session"
            })
            
    # Sort prompts by timestamp descending
    all_prompts.sort(key=lambda x: x["timestamp"], reverse=True)
    return all_prompts
