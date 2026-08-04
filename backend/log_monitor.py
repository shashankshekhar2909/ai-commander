import os
import json
import glob
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

HOME_DIR = str(Path.home())
GEMINI_BRAIN_DIR = os.path.join(HOME_DIR, ".gemini", "antigravity-cli", "brain")

def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    return max(1, len(text) // 4)

def estimate_cost(input_tokens: int, output_tokens: int) -> float:
    input_cost = (input_tokens / 1_000_000) * 3.0
    output_cost = (output_tokens / 1_000_000) * 15.0
    return round(input_cost + output_cost, 4)

def get_storage_diagnostics() -> Dict[str, Any]:
    total_bytes = 0
    file_count = 0
    session_count = 0
    
    if os.path.exists(GEMINI_BRAIN_DIR):
        for root, dirs, files in os.walk(GEMINI_BRAIN_DIR):
            file_count += len(files)
            for f in files:
                fp = os.path.join(root, f)
                try:
                    total_bytes += os.path.getsize(fp)
                except Exception:
                    pass
        session_count = len([d for d in os.listdir(GEMINI_BRAIN_DIR) if os.path.isdir(os.path.join(GEMINI_BRAIN_DIR, d))])
        
    mb_used = round(total_bytes / (1024 * 1024), 2)
    return {
        "brain_dir": GEMINI_BRAIN_DIR,
        "total_sessions": session_count,
        "total_files": file_count,
        "total_megabytes": mb_used,
        "total_gigabytes": round(mb_used / 1024, 3)
    }

def get_ollama_models() -> List[Dict[str, Any]]:
    models = []
    try:
        res = subprocess.run(["ollama", "list"], capture_output=True, text=True, timeout=3)
        if res.returncode == 0 and res.stdout:
            lines = res.stdout.strip().split("\n")
            for line in lines[1:]:
                parts = line.split()
                if len(parts) >= 3:
                    name = parts[0]
                    size = parts[2] + " " + (parts[3] if len(parts) > 3 and not parts[3].startswith("20") else "")
                    models.append({
                        "name": name,
                        "size": size,
                        "status": "Available Locally"
                    })
    except Exception:
        pass
    return models

def scan_ai_sessions() -> List[Dict[str, Any]]:
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
    total_input_chars = 0
    total_output_chars = 0
    
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
                        total_input_chars += len(content or "")
                        if first_prompt == "No prompt recorded" and content:
                            first_prompt = content.strip()
                        if content:
                            latest_prompt = content.strip()
                    else:
                        total_output_chars += len(content or "")
                            
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
        
    input_tokens = estimate_tokens("a" * total_input_chars)
    output_tokens = estimate_tokens("a" * total_output_chars)
    estimated_cost_val = estimate_cost(input_tokens, output_tokens)

    return {
        "conversation_id": conversation_id,
        "path": session_path,
        "first_prompt": first_prompt[:180] + "..." if len(first_prompt) > 180 else first_prompt,
        "latest_prompt": latest_prompt[:180] + "..." if len(latest_prompt) > 180 else latest_prompt,
        "step_count": step_count,
        "tool_calls_count": tool_calls_count,
        "subagents_count": subagents_count,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "estimated_api_cost": estimated_cost_val,
        "last_updated": last_updated,
        "status": status
    }

def get_session_transcript_logs(conversation_id: str, limit: int = 500) -> Dict[str, Any]:
    session_path = os.path.join(GEMINI_BRAIN_DIR, conversation_id)
    logs_dir = os.path.join(session_path, ".system_generated", "logs")
    transcript_file = os.path.join(logs_dir, "transcript.jsonl")
    
    if not os.path.exists(transcript_file):
        return {"error": f"Transcript for session {conversation_id} not found."}
        
    steps = []
    user_prompts = []
    tool_history = []
    subagent_tree = []
    
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
                            tool_name = tc.get("name")
                            tool_history.append({
                                "line_no": line_no,
                                "name": tool_name,
                                "summary": tc.get("summary", ""),
                                "args": tc.get("args", {})
                            })
                            if tool_name == "invoke_subagent":
                                args = tc.get("args", {})
                                subagents = args.get("Subagents", [])
                                for sa in subagents:
                                    subagent_tree.append({
                                        "line_no": line_no,
                                        "role": sa.get("Role", "Subagent"),
                                        "type_name": sa.get("TypeName", "subagent"),
                                        "prompt": sa.get("Prompt", ""),
                                        "model": sa.get("Model", "inherit")
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
        "subagent_tree": subagent_tree,
        "steps": steps[-limit:]
    }

def export_session_markdown(conversation_id: str) -> str:
    data = get_session_transcript_logs(conversation_id, limit=5000)
    if "error" in data:
        return f"# Error: {data['error']}"
        
    md = f"# 🤖 AI Agent Session Transcript Audit Report\n\n"
    md += f"- **Session ID**: `{conversation_id}`\n"
    md += f"- **Total Steps**: {data['total_steps']}\n"
    md += f"- **Prompts Count**: {len(data['user_prompts'])}\n"
    md += f"- **Tool Calls Executed**: {len(data['tool_history'])}\n\n"
    md += f"---\n\n## 📜 Step-by-Step Execution Timeline\n\n"
    
    for step in data.get("steps", []):
        is_user = step["type"] == "USER_INPUT" or step["source"] == "USER_EXPLICIT"
        has_tools = bool(step.get("tool_calls"))
        
        step_title = "USER PROMPT" if is_user else "TOOL EXECUTION" if has_tools else "MODEL ANSWER"
        md += f"### Step #{step['line_no']} - {step_title}\n\n"
        
        if step.get("content"):
            md += f"```\n{step['content']}\n```\n\n"
            
        if has_tools:
            md += "**Invoked Tools:**\n"
            for tc in step["tool_calls"]:
                md += f"- **Tool**: `{tc.get('name')}` - {tc.get('summary', '')}\n"
            md += "\n"
            
    return md

def scan_all_prompts() -> List[Dict[str, Any]]:
    sessions = scan_ai_sessions()
    all_prompts = []
    
    for s in sessions:
        cid = s["conversation_id"]
        logs = get_session_transcript_logs(cid, limit=2000)
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
            
    all_prompts.sort(key=lambda x: x["timestamp"], reverse=True)
    return all_prompts

def search_all_transcripts(query: str, max_results: int = 50) -> List[Dict[str, Any]]:
    if not query or not query.strip():
        return []
        
    q = query.lower().strip()
    sessions = scan_ai_sessions()
    results = []
    
    for s in sessions:
        cid = s["conversation_id"]
        logs = get_session_transcript_logs(cid, limit=2000)
        steps = logs.get("steps", [])
        
        for step in steps:
            content = step.get("content", "")
            tool_str = json.dumps(step.get("tool_calls") or {})
            
            if q in content.lower() or q in tool_str.lower():
                results.append({
                    "conversation_id": cid,
                    "line_no": step["line_no"],
                    "step_type": step["type"],
                    "content_snippet": content[:240] + ("..." if len(content) > 240 else ""),
                    "tool_calls": step.get("tool_calls", []),
                    "timestamp": s["last_updated"]
                })
                if len(results) >= max_results:
                    return results
                    
    return results

def get_token_analytics() -> Dict[str, Any]:
    sessions = scan_ai_sessions()
    total_tokens = sum(s.get("total_tokens", 0) for s in sessions)
    total_input = sum(s.get("input_tokens", 0) for s in sessions)
    total_output = sum(s.get("output_tokens", 0) for s in sessions)
    total_cost = round(sum(s.get("estimated_api_cost", 0.0) for s in sessions), 2)
    
    return {
        "total_sessions": len(sessions),
        "total_tokens": total_tokens,
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "estimated_api_cost_dollars": total_cost,
        "local_llm_cost_savings_dollars": total_cost
    }
