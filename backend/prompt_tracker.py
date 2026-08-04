import sqlite3
import time
import os
from typing import List, Dict, Any, Optional
from log_monitor import scan_all_prompts

DB_PATH = os.path.join(os.path.dirname(__file__), "ai_commander.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT,
            prompt_text TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            tags TEXT DEFAULT '',
            is_favorite BOOLEAN DEFAULT 0,
            timestamp REAL,
            response_notes TEXT DEFAULT ''
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompt_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            template_text TEXT NOT NULL,
            category TEXT DEFAULT 'Coding',
            description TEXT DEFAULT ''
        )
    """)
    conn.commit()
    conn.close()

def sync_prompts_from_logs():
    init_db()
    logs_prompts = scan_all_prompts()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check existing prompts to prevent duplicate insertion
    cursor.execute("SELECT conversation_id, prompt_text FROM prompts")
    existing = set((row[0], row[1]) for row in cursor.fetchall())
    
    new_entries = 0
    for item in logs_prompts:
        key = (item["conversation_id"], item["prompt"])
        if key not in existing:
            cursor.execute("""
                INSERT INTO prompts (conversation_id, prompt_text, timestamp)
                VALUES (?, ?, ?)
            """, (item["conversation_id"], item["prompt"], item["timestamp"]))
            new_entries += 1
            
    conn.commit()
    conn.close()
    return new_entries

def get_prompts_list(search: str = "", category: str = "", favorite_only: bool = False, limit: int = 100) -> List[Dict[str, Any]]:
    sync_prompts_from_logs()
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query = "SELECT * FROM prompts WHERE 1=1"
    params = []
    
    if search:
        query += " AND prompt_text LIKE ?"
        params.append(f"%{search}%")
        
    if category:
        query += " AND category = ?"
        params.append(category)
        
    if favorite_only:
        query += " AND is_favorite = 1"
        
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "conversation_id": r["conversation_id"],
            "prompt_text": r["prompt_text"],
            "category": r["category"],
            "tags": r["tags"].split(",") if r["tags"] else [],
            "is_favorite": bool(r["is_favorite"]),
            "timestamp": r["timestamp"],
            "response_notes": r["response_notes"]
        })
        
    conn.close()
    return results

def toggle_favorite_prompt(prompt_id: int) -> Dict[str, Any]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT is_favorite FROM prompts WHERE id = ?", (prompt_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"success": False, "message": "Prompt not found"}
        
    new_fav = 0 if row[0] else 1
    cursor.execute("UPDATE prompts SET is_favorite = ? WHERE id = ?", (new_fav, prompt_id))
    conn.commit()
    conn.close()
    return {"success": True, "is_favorite": bool(new_fav)}

def get_prompt_analytics() -> Dict[str, Any]:
    prompts = get_prompts_list(limit=1000)
    total_prompts = len(prompts)
    fav_count = sum(1 for p in prompts if p["is_favorite"])
    avg_len = round(sum(len(p["prompt_text"]) for p in prompts) / total_prompts, 1) if total_prompts > 0 else 0
    
    # Categorize by keyword
    categories = {"Coding": 0, "Debugging": 0, "Architecture": 0, "General": 0}
    for p in prompts:
        t = p["prompt_text"].lower()
        if any(w in t for w in ["bug", "fix", "error", "traceback", "failed"]):
            categories["Debugging"] += 1
        elif any(w in t for w in ["create", "build", "write", "add", "implement"]):
            categories["Coding"] += 1
        elif any(w in t for w in ["design", "arch", "system", "structure"]):
            categories["Architecture"] += 1
        else:
            categories["General"] += 1
            
    return {
        "total_prompts": total_prompts,
        "favorite_prompts": fav_count,
        "avg_prompt_length": avg_len,
        "category_breakdown": categories,
        "latest_activity": prompts[0]["timestamp"] if prompts else time.time()
    }
