<div align="center">

# ⚡ AI COMMANDER

**Real-time Mission Control & Telemetry Dashboard for Local AI Agents, Tasks & Prompts**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-000000.svg?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.14-3776AB.svg?style=for-the-badge&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_v4-06B6D4.svg?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)

</div>

---

## 📖 Overview

**AI Commander** is a unified telemetry mission control system built to monitor, audit, and manage all AI agent workflows, background execution tasks, prompt histories, and system resource consumption on your laptop.

It combines a **Python REST API + WebSockets backend** with a **Next.js 16 analytics dashboard**, providing real-time process scanning, transcript log indexing, and prompt tracking.

```mermaid
graph TD
    A[💻 Laptop Environment] -->|Process Scanner psutil| B(🐍 Python REST API)
    A -->|JSONL Transcripts ~/.gemini/brain| B
    B -->|SQLite Database| C[(ai_commander.db)]
    B <-->|WebSocket Stream /ws/live| D(⚡ Next.js Analytics UI)
    B <-->|REST Endpoints /api/*| D
    D -->|Task Execution| E[🖥️ AI Commander Console Deck]
```

---

## ⚡ Current Core Capabilities

| Module | Features & Capabilities |
| :--- | :--- |
| **🖥️ System Telemetry** | Real-time tracking of CPU utilization, RAM usage (GB used/total), Disk space, active process count, and live WebSocket telemetry metrics. |
| **🔍 AI Process Scanner** | Auto-detects local LLM servers (Ollama, vLLM, LM Studio), AGY / Antigravity Agents, Claude/Cursor extensions, Python AI scripts, and vector databases. Provides PID, command line inspection, and one-click process termination. |
| **📚 Prompt Vault** | Automatically parses and indexes all user prompts from agent transcripts into SQLite. Supports prompt search, bookmarking, character length analytics, and copy-to-clipboard. |
| **📜 Agent Log Explorer** | Deep step-by-step transcript viewer for session JSONL files. Filter steps by User Prompts, Model Answers, Tool Calls (`run_command`, `replace_file_content`), and Subagent events. |
| **🎮 Commander Console Deck** | Execute background shell commands, run python AI diagnostics, check installed models, and view live stdout/stderr streams. |

---

## 🔮 Roadmap: Future Feature Expansion Ideas

Here are powerful feature enhancements planned for **AI Commander**:

```mermaid
mindmap
  root((AI Commander Expansion))
    GPU & Hardware Telemetry
      Apple Silicon Metal GPU monitoring
      NPU / Neural Engine utilization
    Agent Lineage Visualizer
      Parent-Subagent tree graph
      Tool call dependency graph
    Token & Cost Analytics
      Token counter across sessions
      Estimated API & local LLM cost
    Rogue Process Watchdog
      Auto-kill policies on high CPU
      Threshold alerts
    Global Semantic Search
      SQLite FTS5 full-text search
      Vector search across past prompts
    Desktop Notifications
      macOS native alerts on task complete
      Task failure sound triggers
```

### 1. 🏎️ GPU & Apple Silicon Metal Hardware Telemetry
- **Apple Silicon (M1/M2/M3/M4) GPU Monitoring**: Integrate `powermetrics` / `system_profiler` to track GPU core load %, Metal memory usage, and Neural Engine (NPU) inference power consumption.
- **NVIDIA CUDA Stats**: For Linux/Windows nodes, add `pynvml` integration for VRAM, GPU temperature, and tensor core utilization.

### 2. 🌳 Multi-Agent Lineage & Subagent Visualizer
- **Tree Hierarchy**: Render an interactive node graph showing parent agent -> subagent relationships, delegated task scopes, and tool execution dependencies.
- **Live Lifecycle Status**: Highlight running, idle, completed, or errored subagents in real-time.

### 3. 📊 Token & Cost Estimator Dashboard
- **Token Counter**: Calculate total input (prompt) and output (completion) tokens used per session and model provider.
- **Cost Metrics**: Track estimated dollar cost for API providers (OpenAI, Anthropic, Gemini) vs local zero-cost LLMs (Ollama).

### 4. 🐕 Rogue Process Watchdog & Auto-Kill Policies
- **Threshold Rules**: Define automated rules (e.g. *"If any Python or Ollama process exceeds 90% CPU for > 5 minutes, auto-throttle or send alert"*).
- **Auto-Cleanup**: Automatically release zombie child processes when an agent finishes.

### 5. 🔍 Global Semantic Log & Prompt Search Engine
- **SQLite FTS5 Full-Text Search**: Instant search across millions of lines of transcript logs, code snippets, and generated diffs.
- **Vector Indexing**: Local embeddings (via `sentence-transformers` / `chromadb`) to perform semantic search for past solutions and prompt patterns.

### 6. 🔔 macOS Native Desktop Notifications
- **System Alerts**: Send native macOS banner notifications when a long-running AI task completes, fails, or requires user input.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.10+ (Tested on Python 3.14)
- **Node.js**: v18+ (Tested on Node v26)

### One-Click Launch

Run the startup script from the root directory:

```bash
./start_ai_commander.sh
```

### Access Ports

| Interface | URL | Description |
| :--- | :--- | :--- |
| **Next.js Analytics UI** | [http://localhost:3000](http://localhost:3000) | Main Telemetry Dashboard |
| **FastAPI REST API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI Documentation |
| **WebSocket Telemetry** | `ws://localhost:8000/ws/live` | Real-time metric stream |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/system/stats` | Returns CPU%, RAM%, Disk% telemetry |
| `GET` | `/api/processes?all=false` | Returns list of running AI processes & tasks |
| `POST` | `/api/processes/{pid}/kill` | Terminates process by PID |
| `GET` | `/api/prompts` | Searches and returns prompt vault items |
| `POST` | `/api/prompts/{id}/favorite` | Toggles prompt bookmark |
| `GET` | `/api/prompts/analytics` | Returns prompt usage statistics |
| `GET` | `/api/sessions` | Returns list of discovered AI agent sessions |
| `GET` | `/api/sessions/{id}/logs` | Returns parsed JSONL transcript steps |
| `POST` | `/api/commander/run` | Executes command line instruction |
| `WS` | `/ws/live` | WebSocket connection streaming telemetry |

---

## 📂 Project Architecture

```
ai-commander/
├── backend/                  # Python REST API Backend
│   ├── venv/                 # Virtual Environment
│   ├── main.py               # FastAPI Router & WebSocket Server
│   ├── process_tracker.py    # psutil System & AI Process Scanner
│   ├── log_monitor.py        # Transcript JSONL & Log Parser
│   ├── prompt_tracker.py     # SQLite Database & Prompt Analytics
│   ├── commander_service.py  # Shell Task Execution Service
│   ├── requirements.txt      # Python Dependencies
│   └── ai_commander.db       # SQLite Database
│
├── frontend/                 # Next.js 16 Web UI Frontend
│   ├── app/                  # App Router Pages
│   │   ├── page.tsx          # Telemetry Dashboard
│   │   ├── tasks/page.tsx    # Process & Task Manager
│   │   ├── prompts/page.tsx  # Prompt Vault & Tracker
│   │   ├── logs/page.tsx     # Agent Transcripts Explorer
│   │   └── commander/page.tsx# Commander Console Deck
│   ├── components/           # Navbar & UI Analytics Components
│   └── lib/api.ts            # REST & WebSocket API Client
│
├── start_ai_commander.sh     # One-Click Startup Script
├── .gitignore                # Root Git Ignore
└── README.md                 # Project Documentation
```

---

<div align="center">

**AI Commander** &bull; Built with Python REST API & Next.js 16 Analytics

</div>
