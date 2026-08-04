#!/usr/bin/env bash

echo "============================================================"
echo "           STARTING AI COMMANDER SYSTEM"
echo "============================================================"

# Kill existing instances if running on ports 8000 or 3000
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "[1/2] Launching Python REST API Backend on http://localhost:8000..."
cd "$(dirname "$0")/backend" || exit
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "[2/2] Launching Next.js UI Frontend on http://localhost:3000..."
cd "$(dirname "$0")/frontend" || exit
npm run dev &
FRONTEND_PID=$!

sleep 3

echo ""
echo "============================================================"
echo "🚀 AI COMMANDER IS LIVE!"
echo "------------------------------------------------------------"
echo "  🖥️ Next.js Web UI:       http://localhost:3000"
echo "  ⚡ Python REST API Docs: http://localhost:8000/docs"
echo "  📡 WebSocket Telemetry:  ws://localhost:8000/ws/live"
echo "============================================================"
echo "Press Ctrl+C to stop all AI Commander services."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
