"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  MessageSquareCode, 
  ScrollText, 
  Terminal, 
  RefreshCw,
  XCircle,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  ArrowUpRight,
  Zap,
  Coins,
  ShieldCheck
} from "lucide-react";
import { 
  fetchSystemStats, 
  fetchProcesses, 
  fetchSessions, 
  fetchPrompts, 
  killProcess,
  triggerAutoKillWatchdog,
  fetchTokenAnalytics,
  SystemStats, 
  AIProcess, 
  AISession, 
  PromptItem,
  TokenAnalytics
} from "@/lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [processes, setProcesses] = useState<AIProcess[]>([]);
  const [highResourceCount, setHighResourceCount] = useState(0);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      const [sysStats, procData, sessionData, promptData, tokData] = await Promise.all([
        fetchSystemStats().catch(() => null),
        fetchProcesses().catch(() => ({ count: 0, high_resource_count: 0, processes: [] })),
        fetchSessions().catch(() => ({ count: 0, sessions: [] })),
        fetchPrompts("", "", false).catch(() => ({ count: 0, prompts: [] })),
        fetchTokenAnalytics().catch(() => null)
      ]);

      if (sysStats) setStats(sysStats);
      setProcesses(procData.processes || []);
      setHighResourceCount(procData.high_resource_count || 0);
      setSessions(sessionData.sessions || []);
      setPrompts(promptData.prompts || []);
      if (tokData) setTokenStats(tokData);
      setError(null);
    } catch (e: any) {
      setError("Unable to connect to Python REST API (localhost:8000). Verify backend process.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleKillProcess = async (pid: number, name: string) => {
    if (!confirm(`Terminate PID ${pid} (${name})?`)) return;
    try {
      const res = await killProcess(pid);
      setActionMsg(res.message);
      loadDashboardData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert("Failed to terminate process: " + err.message);
    }
  };

  const handleAutoKillWatchdog = async () => {
    if (!confirm("Run Watchdog Auto-Kill on all AI processes exceeding 85% CPU?")) return;
    try {
      const res = await triggerAutoKillWatchdog(85.0);
      setActionMsg(res.message);
      loadDashboardData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert("Watchdog action failed: " + err.message);
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              System Telemetry & Hardware Watchdog
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-bold">
              {stats?.chip_model || "Apple Silicon / Unix"}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time telemetry monitoring running AI tasks, token analytics, rogue process watchdog, and session transcripts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {highResourceCount > 0 && (
            <button
              onClick={handleAutoKillWatchdog}
              className="px-3 py-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-mono flex items-center gap-1.5 transition-colors animate-pulse"
              title="Auto-Kill High CPU Rogue AI Processes"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Watchdog: Auto-Kill ({highResourceCount} High CPU)
            </button>
          )}

          <button
            onClick={loadDashboardData}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            Refresh Data
          </button>

          <Link 
            href="/commander"
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" /> Launch Task
          </Link>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 px-3.5 py-2 rounded text-xs font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>{actionMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 px-3.5 py-2.5 rounded text-xs font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="analytics-card p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>CPU UTILIZATION</span>
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {stats ? `${stats.cpu_percent}%` : "--"}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${stats ? stats.cpu_percent : 0}%` }}
            ></div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">
            {stats ? `${stats.cpu_count} Cores Active` : "Loading..."}
          </span>
        </div>

        <div className="analytics-card p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>MEMORY (RAM)</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {stats ? `${stats.memory_percent}%` : "--"}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${stats ? stats.memory_percent : 0}%` }}
            ></div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">
            {stats ? `${stats.memory_used_gb} / ${stats.memory_total_gb} GB` : "Loading..."}
          </span>
        </div>

        <div className="analytics-card p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>AI PROCESSES</span>
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {processes.length}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div className="bg-amber-500 h-full w-full"></div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">
            {highResourceCount > 0 ? `${highResourceCount} High Load` : "Normal Load"}
          </span>
        </div>

        <div className="analytics-card p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>TOTAL TOKENS</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-400">
            {tokenStats ? tokenStats.total_tokens.toLocaleString() : "--"}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div className="bg-purple-500 h-full w-full"></div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">
            {tokenStats ? `${tokenStats.total_input_tokens} In / ${tokenStats.total_output_tokens} Out` : "Estimating..."}
          </span>
        </div>

        <div className="analytics-card p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>LOCAL COST SAVINGS</span>
            <Coins className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-bold font-mono text-teal-400">
            {tokenStats ? `$${tokenStats.local_llm_cost_savings_dollars}` : "--"}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div className="bg-teal-500 h-full w-full"></div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">Vs API Rates</span>
        </div>

        <div className="analytics-card p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>DISCOVERED SESSIONS</span>
            <ScrollText className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-400">
            {sessions.length}
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
            <div className="bg-indigo-500 h-full w-full"></div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">Indexed Transcripts</span>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2/3): Running AI Processes Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <h2 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider">
                Live AI Task Telemetry
              </h2>
            </div>
            <Link href="/tasks" className="text-xs font-mono text-blue-400 hover:underline flex items-center gap-1">
              View All ({processes.length}) <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="analytics-panel overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                Scanning system process table...
              </div>
            ) : processes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No active AI processes detected.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="data-table-header text-slate-400 uppercase text-[11px]">
                      <th className="py-2.5 px-3">PID</th>
                      <th className="py-2.5 px-3">Process Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">CPU %</th>
                      <th className="py-2.5 px-3 text-right">RAM (MB)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {processes.slice(0, 7).map((proc) => (
                      <tr key={proc.pid} className={`hover:bg-slate-800/50 transition-colors ${proc.is_high_resource ? "bg-rose-950/20" : ""}`}>
                        <td className="py-2.5 px-3 font-bold text-slate-300">
                          {proc.pid}
                          {proc.is_high_resource && <span className="ml-1 text-rose-400 font-normal text-[9px] border border-rose-800 px-1 rounded">HIGH</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-200 text-xs font-sans">{proc.name}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">{proc.cmdline || "No args"}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                            {proc.category}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${proc.cpu_percent > 80 ? "text-rose-400 animate-pulse" : "text-blue-400"}`}>
                          {proc.cpu_percent}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400">
                          {proc.memory_mb} MB
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleKillProcess(proc.pid, proc.name)}
                            className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[10px] font-mono transition-colors"
                          >
                            Kill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Prompt Feed & Session Metrics */}
        <div className="space-y-4 font-mono">
          {/* Prompts Activity Stream */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Prompts Stream
                </h2>
              </div>
              <Link href="/prompts" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                Vault <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="analytics-panel p-3 space-y-2.5">
              {prompts.slice(0, 4).map((p) => (
                <div key={p.id} className="p-2.5 rounded bg-[#070a11] border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {new Date(p.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(p.prompt_text, p.id)}
                      className="hover:text-slate-200 transition-colors flex items-center gap-1 text-[10px]"
                    >
                      {copiedId === p.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      {copiedId === p.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-slate-300 line-clamp-2 font-sans text-xs leading-relaxed">
                    "{p.prompt_text}"
                  </p>
                </div>
              ))}
              {prompts.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No prompts recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Discovered Agent Sessions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Discovered Agent Logs
                </h2>
              </div>
              <Link href="/logs" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
                Transcripts <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="analytics-panel p-3 space-y-2">
              {sessions.slice(0, 3).map((sess) => (
                <Link 
                  key={sess.conversation_id}
                  href={`/logs?session=${sess.conversation_id}`}
                  className="block p-2.5 rounded bg-[#070a11] border border-slate-800 hover:border-slate-700 text-xs space-y-1 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-blue-400 font-bold truncate max-w-[140px]">
                      Session: {sess.conversation_id.slice(0, 10)}...
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {sess.step_count} steps
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate font-sans">
                    {sess.first_prompt || "Agent session active"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
