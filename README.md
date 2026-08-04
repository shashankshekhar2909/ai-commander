# 🤖 AI COMMANDER

**AI Commander** is a local mission control platform built using a **Python REST API** backend and a **Next.js 16** frontend. It tracks all AI-based tasks and processes running on your laptop, logs every prompt given across AI agent sessions, inspects transcript logs, and provides a command deck to control and execute tasks.

---

## 🌟 Key Features

1. **AI Process & Task Scanner**:
   - Automatically scans running system processes using `psutil`.
   - Detects and categorizes AI tasks (Ollama, AGY / Antigravity Agents, Claude, Cursor, LLM Servers, Python AI scripts, Vector DBs, Node.js workers).
   - Monitors CPU %, Memory (MB), PID, owner, and command line parameters.
   - Allows one-click termination of rogue or runaway AI processes.

2. **Prompt Vault & Analytics**:
   - Parses transcript logs from AI agent sessions (`~/.gemini/antigravity-cli/brain/*/logs/transcript.jsonl`).
   - Indexes all user prompts in a persistent SQLite database (`ai_commander.db`).
   - Features prompt search, filtering by category / bookmark state, prompt length metrics, and prompt copy/reuse.

3. **Agent Transcripts & Log Inspector**:
   - Interactive JSONL log viewer for session transcripts.
   - Step-by-step filter for User Prompts, Model Responses, Tool Executions (`run_command`, `replace_file_content`, `invoke_subagent`), and Subagents.
   - Line-by-line inspection with formatted code outputs and parameter views.

4. **Commander Deck & Control**:
   - Command launcher interface to execute shell or Python AI scripts directly from the browser.
   - Live stdout/stderr logging, exit code reporting, and execution duration.

5. **Real-time Live Telemetry**:
   - System CPU, RAM, Disk monitoring via FastAPI REST API and WebSocket live stream (`ws://localhost:8000/ws/live`).

---

## 🚀 Quick Start

To launch both the Python REST API backend and Next.js frontend with one command, run:

```bash
./start_ai_commander.sh
```

### Access Ports:
- **Next.js Web UI**: [http://localhost:3000](http://localhost:3000)
- **Python REST API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **WebSocket Telemetry**: `ws://localhost:8000/ws/live`

---

## 🛠️ Architecture & Tech Stack

```
agy/
├── backend/                  # Python REST API
│   ├── venv/                 # Virtual Environment
│   ├── main.py               # FastAPI App & WebSocket Router
│   ├── process_tracker.py    # psutil System & AI Process Scanner
│   ├── log_monitor.py        # Transcript JSONL & Log Parser
│   ├── prompt_tracker.py     # SQLite Database & Prompt Analytics
│   ├── commander_service.py  # Shell Task Runner Service
│   └── ai_commander.db       # SQLite DB
│
├── frontend/                 # Next.js 16 Web UI
│   ├── app/                  # App Router Pages
│   │   ├── page.tsx          # Dashboard / Live Telemetry
│   │   ├── tasks/page.tsx    # AI Tasks & Process Manager
│   │   ├── prompts/page.tsx  # Prompt Tracker & Vault
│   │   ├── logs/page.tsx     # Agent Transcripts & Log Inspector
│   │   └── commander/page.tsx# Commander Deck Console
│   ├── components/           # UI Components (Navbar, Cards, Modals)
│   └── lib/api.ts            # REST API & WebSocket Client
│
└── start_ai_commander.sh     # One-click startup script
```

---

## 📡 REST API Endpoints

- `GET /api/system/stats` - Total system resource usage (CPU%, RAM%, Disk%)
- `GET /api/processes` - List running AI processes & tasks
- `POST /api/processes/{pid}/kill` - Terminate process by PID
- `GET /api/prompts` - Search & filter recorded user prompts
- `POST /api/prompts/{id}/favorite` - Toggle prompt bookmark
- `GET /api/prompts/analytics` - Prompt usage & category statistics
- `GET /api/sessions` - List AI agent sessions discovered on machine
- `GET /api/sessions/{session_id}/logs` - Parse session JSONL transcript steps
- `POST /api/commander/run` - Execute shell command or task instruction
- `WS /ws/live` - Live WebSocket telemetry stream
