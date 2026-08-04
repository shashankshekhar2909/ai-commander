import subprocess
import shlex
import os
import time
from typing import List, Dict, Any

COMMANDER_TASKS = []

def send_macos_notification(title: str, message: str):
    try:
        script = f'display notification "{message}" with title "{title}"'
        subprocess.run(["osascript", "-e", script], timeout=2, capture_output=True)
    except Exception:
        pass

def run_ai_command(command: str, cwd: str = None) -> Dict[str, Any]:
    if not cwd:
        cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
    task_id = f"task_{int(time.time()*1000)}"
    task_record = {
        "task_id": task_id,
        "command": command,
        "status": "RUNNING",
        "start_time": time.time(),
        "end_time": None,
        "output": "",
        "error": "",
        "exit_code": None
    }
    COMMANDER_TASKS.append(task_record)
    
    try:
        process = subprocess.Popen(
            command,
            shell=True,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(timeout=20)
        task_record["status"] = "COMPLETED" if process.returncode == 0 else "FAILED"
        task_record["end_time"] = time.time()
        task_record["output"] = stdout
        task_record["error"] = stderr
        task_record["exit_code"] = process.returncode
        
        # Trigger macOS Notification
        status_msg = "Task Completed Successfully" if process.returncode == 0 else "Task Execution Failed"
        send_macos_notification("AI Commander Task", f"{status_msg}: {command[:40]}")
    except subprocess.TimeoutExpired:
        task_record["status"] = "TIMED_OUT"
        task_record["output"] = "Command timed out after 20 seconds (running asynchronously)."
        send_macos_notification("AI Commander Task", f"Task Timed Out: {command[:40]}")
    except Exception as e:
        task_record["status"] = "ERROR"
        task_record["error"] = str(e)
        send_macos_notification("AI Commander Error", str(e)[:50])
        
    return task_record

def get_commander_tasks() -> List[Dict[str, Any]]:
    return COMMANDER_TASKS[-50:]
