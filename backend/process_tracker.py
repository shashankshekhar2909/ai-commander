import psutil
import time
import os
import subprocess
from typing import List, Dict, Any

AI_KEYWORDS = [
    "agy", "antigravity", "gemini", "ollama", "claude", "cursor", "copilot", 
    "openai", "vllm", "lmstudio", "llama", "whisper", "langchain", "autogen", 
    "crewai", "agent", "subagent", "torch", "transformers", "huggingface", 
    "open-webui", "chromadb", "qdrant", "milvus", "fastapi", "python", "node"
]

AI_CATEGORIES = {
    "AGY / Antigravity Agent": ["agy", "antigravity", "gemini"],
    "Local LLM Server": ["ollama", "lmstudio", "vllm", "llama.cpp", "text-generation"],
    "AI IDE / Extension": ["claude", "cursor", "copilot", "codeium"],
    "Vector Database": ["chromadb", "qdrant", "milvus", "pinecone", "weaviate"],
    "Python AI Framework": ["torch", "transformers", "langchain", "crewai", "autogen", "whisper"],
}

def get_hardware_info() -> Dict[str, Any]:
    chip_model = "Mac / Unix Host"
    try:
        res = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True, timeout=2)
        if res.returncode == 0 and res.stdout.strip():
            chip_model = res.stdout.strip()
        else:
            res2 = subprocess.run(["sysctl", "-n", "hw.model"], capture_output=True, text=True, timeout=2)
            if res2.returncode == 0 and res2.stdout.strip():
                chip_model = res2.stdout.strip()
    except Exception:
        pass

    return {
        "chip_model": chip_model,
        "logical_cores": psutil.cpu_count(logical=True),
        "physical_cores": psutil.cpu_count(logical=False) or psutil.cpu_count(logical=True),
        "total_memory_gb": round(psutil.virtual_memory().total / (1024**3), 2),
        "architecture": "Apple Silicon (ARM64)" if "Apple" in chip_model or os.uname().machine == "arm64" else os.uname().machine
    }

def categorize_process(cmdline_str: str, name: str) -> str:
    combined = (cmdline_str + " " + name).lower()
    for cat, keywords in AI_CATEGORIES.items():
        if any(kw in combined for kw in keywords):
            return cat
    if "python" in combined:
        return "Python Script / App"
    if "node" in combined or "bun" in combined:
        return "Node.js Process"
    return "Other Process"

def is_ai_process(proc_info: Dict[str, Any]) -> bool:
    cmdline = " ".join(proc_info.get("cmdline") or []).lower()
    name = (proc_info.get("name") or "").lower()
    combined = name + " " + cmdline
    
    if any(kw in combined for kw in ["agy", "antigravity", "gemini", "ollama", "claude", "cursor", "copilot", "vllm", "lmstudio", "llama", "subagent", "crewai", "langchain"]):
        return True
    
    if "python" in name or "python" in cmdline:
        if any(kw in cmdline for kw in ["main.py", "agent", "llm", "ai", "model", "train", "infer", "gpt", "rag", "torch", "backend"]):
            return True
            
    if "node" in name or "node" in cmdline:
        if any(kw in cmdline for kw in ["agent", "cli", "ai", "next", "server"]):
            return True
            
    return False

def get_running_ai_processes(all_processes: bool = False) -> List[Dict[str, Any]]:
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_percent', 'memory_info', 'create_time', 'username', 'status']):
        try:
            info = proc.info
            cmdline_list = info.get('cmdline') or []
            cmdline_str = " ".join(cmdline_list)
            
            if not all_processes and not is_ai_process(info):
                continue
                
            mem_mb = round((info.get('memory_info').rss if info.get('memory_info') else 0) / (1024 * 1024), 2)
            uptime_sec = round(time.time() - info.get('create_time', time.time()), 1)
            cpu_pct = proc.cpu_percent(interval=None)
            
            cat = categorize_process(cmdline_str, info.get('name', ''))
            is_high_resource = cpu_pct > 80.0 or mem_mb > 1500.0
            
            processes.append({
                "pid": info['pid'],
                "name": info['name'],
                "cmdline": cmdline_str,
                "cpu_percent": cpu_pct,
                "memory_percent": round(info.get('memory_percent') or 0.0, 2),
                "memory_mb": mem_mb,
                "status": info.get('status', 'running'),
                "uptime_seconds": uptime_sec,
                "user": info.get('username', 'unknown'),
                "category": cat,
                "is_ai": is_ai_process(info),
                "is_high_resource": is_high_resource
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
            
    processes.sort(key=lambda x: (x['cpu_percent'], x['memory_mb']), reverse=True)
    return processes

def auto_kill_rogue_processes(cpu_threshold: float = 85.0) -> Dict[str, Any]:
    procs = get_running_ai_processes(all_processes=False)
    killed = []
    for p in procs:
        if p["cpu_percent"] >= cpu_threshold and p["pid"] != os.getpid():
            res = kill_ai_process(p["pid"])
            if res["success"]:
                killed.append({"pid": p["pid"], "name": p["name"], "cpu": p["cpu_percent"]})
    return {
        "success": True,
        "count": len(killed),
        "killed_processes": killed,
        "message": f"Terminated {len(killed)} rogue AI processes running above {cpu_threshold}% CPU."
    }

def kill_ai_process(pid: int) -> Dict[str, Any]:
    try:
        proc = psutil.Process(pid)
        proc_name = proc.name()
        proc.terminate()
        proc.wait(timeout=3)
        return {"success": True, "message": f"Process {proc_name} (PID: {pid}) terminated successfully."}
    except psutil.TimeoutExpired:
        proc.kill()
        return {"success": True, "message": f"Process PID {pid} force killed after timeout."}
    except psutil.NoSuchProcess:
        return {"success": False, "message": f"Process PID {pid} not found."}
    except Exception as e:
        return {"success": False, "message": str(e)}

def get_system_telemetry() -> Dict[str, Any]:
    cpu_pct = psutil.cpu_percent(interval=None)
    cpu_count = psutil.cpu_count(logical=True)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    hw = get_hardware_info()
    
    return {
        "cpu_percent": cpu_pct,
        "cpu_count": cpu_count,
        "memory_percent": mem.percent,
        "memory_used_gb": round(mem.used / (1024**3), 2),
        "memory_total_gb": round(mem.total / (1024**3), 2),
        "disk_percent": disk.percent,
        "disk_free_gb": round(disk.free / (1024**3), 2),
        "chip_model": hw["chip_model"],
        "architecture": hw["architecture"],
        "timestamp": time.time()
    }
