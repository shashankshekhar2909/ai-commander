"use client";

import { useEffect, useState } from "react";
import { 
  Terminal, 
  Play, 
  Loader2, 
  Bot,
  PlusCircle,
  FolderOpen,
  Sparkles,
  Cpu
} from "lucide-react";
import { runCommanderCommand, fetchCommanderTasks } from "@/lib/api";

export default function CommanderDeckPage() {
  const [command, setCommand] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [executing, setExecuting] = useState(false);
  const [activeTask, setActiveTask] = useState<any>(null);

  // Pre-configured AI Agent & Task Launcher Presets
  const agentPresets = [
    { 
      title: "Run Process Scanner Agent", 
      category: "System Agent",
      cmd: "backend/venv/bin/python3 backend/process_tracker.py",
      description: "Triggers AI process scanner agent to inspect laptop PIDs & resource usage."
    },
    { 
      title: "Run Log Indexer Agent", 
      category: "Database Agent",
      cmd: "backend/venv/bin/python3 -c 'from prompt_tracker import sync_prompts_from_logs; print(f\"Synced {sync_prompts_from_logs()} new prompts\")'",
      description: "Indexes latest AI transcripts and prompt history into SQLite database."
    },
    { 
      title: "Run Python AI Dependencies Audit", 
      category: "Audit Agent",
      cmd: "backend/venv/bin/pip list | grep -iE 'fastapi|psutil|pydantic|torch|transformers'",
      description: "Inspects installed AI frameworks & Python REST packages."
    },
    { 
      title: "Run System Diagnostics Agent", 
      category: "Telemetry Agent",
      cmd: "python3 --version && sysctl -n machdep.cpu.brand_string || sysctl -n hw.model",
      description: "Checks CPU architecture, Apple Silicon chip specs, and runtime environment."
    }
  ];

  const loadTasks = async () => {
    try {
      const data = await fetchCommanderTasks();
      setTasks(data.tasks || []);
      if (data.tasks && data.tasks.length > 0) {
        setActiveTask(data.tasks[data.tasks.length - 1]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleExecute = async (cmdToRun?: string) => {
    const targetCmd = cmdToRun || command;
    if (!targetCmd.trim()) return;

    setExecuting(true);
    try {
      const result = await runCommanderCommand(targetCmd);
      setActiveTask(result);
      loadTasks();
      if (!cmdToRun) setCommand("");
    } catch (err: any) {
      alert("Agent execution error: " + err.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
              BUILD WITH SHASHANK
            </span>
            <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              AI Agent & Application Launcher Console
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Launch new AI agents, execute custom Python scripts, run background tasks, and monitor live execution logs.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Agent Launcher Ready</span>
        </div>
      </div>

      {/* AI Agent Launcher Presets Grid */}
      <div className="space-y-2">
        <label className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
          <Bot className="w-3.5 h-3.5 text-blue-400" />
          LAUNCH AI AGENT WORKERS & APPS:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {agentPresets.map((preset, i) => (
            <button
              key={i}
              onClick={() => {
                setCommand(preset.cmd);
                handleExecute(preset.cmd);
              }}
              disabled={executing}
              className="p-3 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/60 text-left text-xs font-mono transition-all flex flex-col justify-between space-y-2 group"
            >
              <div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-blue-400 font-bold">{preset.category}</span>
                  <Sparkles className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                </div>
                <span className="text-slate-200 font-bold block mt-1 font-sans">{preset.title}</span>
                <p className="text-[10px] text-slate-400 font-sans mt-1 leading-normal line-clamp-2">
                  {preset.description}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono truncate">
                cmd: <code className="text-slate-300">{preset.cmd}</code>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Agent Command Launcher Input */}
      <div className="analytics-panel p-4 space-y-2">
        <label className="text-[10px] text-slate-400 uppercase font-bold block">
          RUN CUSTOM AI AGENT SCRIPT OR COMMAND:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. python3 my_agent.py --task 'Build feature' or backend/venv/bin/python3 backend/main.py"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleExecute()}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleExecute()}
            disabled={executing || !command.trim()}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {executing ? "Launching Agent..." : "Launch Agent"}
          </button>
        </div>
      </div>

      {/* Execution Terminal Output Stream */}
      {activeTask && (
        <div className="analytics-panel overflow-hidden">
          <div className="data-table-header p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-200 font-bold">Execution Output #{activeTask.task_id}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                activeTask.status === "COMPLETED"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : activeTask.status === "FAILED"
                  ? "bg-rose-950 text-rose-400 border border-rose-800"
                  : "bg-amber-950 text-amber-400 border border-amber-800"
              }`}>
                {activeTask.status}
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">
              cmd: <code className="text-blue-300">{activeTask.command}</code>
            </div>
          </div>

          <div className="code-block p-4 text-xs space-y-3 max-h-[450px] overflow-y-auto">
            {activeTask.output && (
              <div>
                <span className="text-emerald-400 text-[10px] block mb-1 uppercase font-bold">// Standard Output (stdout):</span>
                <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed">{activeTask.output}</pre>
              </div>
            )}

            {activeTask.error && (
              <div>
                <span className="text-rose-400 text-[10px] block mb-1 uppercase font-bold">// Standard Error (stderr):</span>
                <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed">{activeTask.error}</pre>
              </div>
            )}

            {!activeTask.output && !activeTask.error && (
              <div className="text-slate-500 italic">No output produced.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
