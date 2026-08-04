"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  ScrollText, 
  Search, 
  Wrench, 
  Filter
} from "lucide-react";
import { fetchSessions, fetchSessionLogs, AISession, LogStep } from "@/lib/api";

function LogsContent() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get("session") || "";

  const [sessions, setSessions] = useState<AISession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId);
  const [logsData, setLogsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSessions().then((data) => {
      setSessions(data.sessions || []);
      if (!selectedSessionId && data.sessions && data.sessions.length > 0) {
        setSelectedSessionId(data.sessions[0].conversation_id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    setLoading(true);
    fetchSessionLogs(selectedSessionId, 500)
      .then((data) => setLogsData(data))
      .catch(() => setLogsData(null))
      .finally(() => setLoading(false));
  }, [selectedSessionId]);

  const steps: LogStep[] = logsData?.steps || [];

  const filteredSteps = steps.filter((step) => {
    if (filterType === "USER" && step.type !== "USER_INPUT" && step.source !== "USER_EXPLICIT") return false;
    if (filterType === "TOOL" && (!step.tool_calls || step.tool_calls.length === 0)) return false;
    if (filterType === "MODEL" && step.type !== "PLANNER_RESPONSE" && step.type !== "MODEL") return false;
    
    if (search) {
      const q = search.toLowerCase();
      const contentMatch = (step.content || "").toLowerCase().includes(q);
      const toolMatch = JSON.stringify(step.tool_calls || {}).toLowerCase().includes(q);
      return contentMatch || toolMatch;
    }
    return true;
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-emerald-400" />
            Agent Transcript & Log Inspector
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Step-by-step execution transcript log viewer for agent sessions and subagent calls.
          </p>
        </div>

        {/* Session Selector */}
        <div className="min-w-[280px]">
          <label className="text-[10px] text-slate-500 block mb-0.5 uppercase font-bold">SESSION SELECTOR:</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          >
            {sessions.map((s) => (
              <option key={s.conversation_id} value={s.conversation_id}>
                {s.conversation_id.slice(0, 16)}... ({s.step_count} steps)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search & Type Filters */}
      <div className="flex flex-col md:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search log content, tool names, or code snippets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-3 pl-9 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1">
          {["ALL", "USER", "TOOL", "MODEL"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                filterType === type
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
              }`}
            >
              {type === "ALL" && "All Steps"}
              {type === "USER" && "User Prompts"}
              {type === "TOOL" && "Tool Calls"}
              {type === "MODEL" && "Model Answers"}
            </button>
          ))}
        </div>
      </div>

      {/* Log Explorer Container */}
      <div className="analytics-panel p-3 space-y-3">
        {loading ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            Fetching session JSONL logs...
          </div>
        ) : !logsData || filteredSteps.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            No transcript steps match the selected filter.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span>Selected Session: <strong className="text-slate-200">{selectedSessionId}</strong></span>
              <span>Matched: {filteredSteps.length} / {logsData.total_steps} total steps</span>
            </div>

            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
              {filteredSteps.map((step) => {
                const isUser = step.type === "USER_INPUT" || step.source === "USER_EXPLICIT";
                const hasTools = step.tool_calls && step.tool_calls.length > 0;

                return (
                  <div 
                    key={step.line_no}
                    className={`p-3 rounded border text-xs space-y-2 ${
                      isUser
                        ? "bg-purple-950/20 border-purple-900/60"
                        : hasTools
                        ? "bg-blue-950/20 border-blue-900/60"
                        : "bg-[#070a11] border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">Line #{step.line_no}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                          isUser 
                            ? "bg-purple-900/60 text-purple-300"
                            : hasTools
                            ? "bg-blue-900/60 text-blue-300"
                            : "bg-emerald-900/60 text-emerald-300"
                        }`}>
                          {isUser ? "USER PROMPT" : hasTools ? "TOOL EXECUTION" : "AGENT RESPONSE"}
                        </span>
                      </div>

                      {step.source && (
                        <span className="text-slate-500 text-[10px]">source: {step.source}</span>
                      )}
                    </div>

                    {step.content && (
                      <div className="code-block p-2.5 rounded text-slate-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                        {step.content}
                      </div>
                    )}

                    {hasTools && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-blue-400 font-bold uppercase block">
                          [Tools Executed]
                        </span>
                        {step.tool_calls?.map((tc, idx) => (
                          <div key={idx} className="bg-[#050811] border border-slate-800 p-2 rounded text-[11px] space-y-1">
                            <div className="flex items-center justify-between font-bold text-blue-300">
                              <span>Tool: {tc.name}</span>
                              <span className="text-slate-400 font-normal text-[10px]">{tc.summary}</span>
                            </div>
                            {tc.args && (
                              <pre className="text-[10px] text-slate-400 bg-slate-950 p-1.5 rounded overflow-x-auto">
                                {JSON.stringify(tc.args, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400 font-mono text-xs">Loading logs inspector...</div>}>
      <LogsContent />
    </Suspense>
  );
}
