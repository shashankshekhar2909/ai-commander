"use client";

import { useEffect, useState } from "react";
import { 
  Cpu, 
  Search, 
  RefreshCw, 
  XCircle, 
  CheckCircle2, 
  Info,
  Terminal,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { fetchProcesses, killProcess, triggerAutoKillWatchdog, AIProcess } from "@/lib/api";

export default function TasksPage() {
  const [processes, setProcesses] = useState<AIProcess[]>([]);
  const [highResourceCount, setHighResourceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProc, setSelectedProc] = useState<AIProcess | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadProcesses = async () => {
    setLoading(true);
    try {
      const data = await fetchProcesses(showAll);
      setProcesses(data.processes || []);
      setHighResourceCount(data.high_resource_count || 0);
    } catch (e: any) {
      setMsg({ text: "Error loading process telemetry", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, [showAll]);

  const handleKill = async (pid: number, name: string) => {
    if (!confirm(`Are you sure you want to terminate PID ${pid} (${name})?`)) return;
    try {
      const res = await killProcess(pid);
      setMsg({ text: res.message, type: res.success ? "success" : "error" });
      if (selectedProc?.pid === pid) setSelectedProc(null);
      loadProcesses();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({ text: "Failed to kill process: " + err.message, type: "error" });
    }
  };

  const handleAutoKillWatchdog = async () => {
    if (!confirm("Run Watchdog Auto-Kill on all AI processes exceeding 85% CPU?")) return;
    try {
      const res = await triggerAutoKillWatchdog(85.0);
      setMsg({ text: res.message, type: "success" });
      loadProcesses();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({ text: "Watchdog auto-kill failed: " + err.message, type: "error" });
    }
  };

  const categories = ["All", "AGY / Antigravity Agent", "Local LLM Server", "AI IDE / Extension", "Python Script / App", "Node.js Process"];

  const filteredProcesses = processes.filter((proc) => {
    const matchesSearch = proc.name.toLowerCase().includes(search.toLowerCase()) || 
                          proc.cmdline.toLowerCase().includes(search.toLowerCase()) ||
                          proc.pid.toString().includes(search);
    const matchesCat = selectedCategory === "All" || proc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            AI Task & Process Watchdog
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            System task inventory tracking CPU%, RAM (MB), PIDs, and process command lines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {highResourceCount > 0 && (
            <button
              onClick={handleAutoKillWatchdog}
              className="px-3 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs flex items-center gap-1 transition-colors animate-pulse"
              title="Auto-Kill High CPU Rogue AI Processes"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Auto-Kill ({highResourceCount} High CPU)
            </button>
          )}

          <button
            onClick={() => setShowAll(!showAll)}
            className={`px-3 py-1 rounded text-xs border transition-colors ${
              showAll
                ? "bg-purple-950/60 text-purple-300 border-purple-800"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            {showAll ? "Showing ALL System Processes" : "Filtered AI Tasks Only"}
          </button>

          <button
            onClick={loadProcesses}
            disabled={loading}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh process scanner"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded text-xs flex items-center gap-2 border ${
          msg.type === "success" 
            ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" 
            : "bg-rose-950/40 border-rose-800 text-rose-300"
        }`}>
          {msg.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by PID, name, or command line arguments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-3 pl-9 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* High Density Process Data Table */}
      <div className="analytics-panel overflow-hidden">
        {loading && processes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-mono">
            Scanning process table...
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No matching tasks or processes found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="data-table-header text-slate-400 uppercase text-[11px]">
                  <th className="py-2.5 px-3">PID</th>
                  <th className="py-2.5 px-3">Process / Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Command Line Arguments</th>
                  <th className="py-2.5 px-3 text-right">CPU %</th>
                  <th className="py-2.5 px-3 text-right">RAM (MB)</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredProcesses.map((proc) => (
                  <tr key={proc.pid} className={`hover:bg-slate-800/50 transition-colors ${proc.is_high_resource ? "bg-rose-950/20" : ""}`}>
                    <td className="py-2 px-3 font-bold text-slate-300">
                      {proc.pid}
                      {proc.is_high_resource && <span className="ml-1 text-rose-400 font-normal text-[9px] border border-rose-800 px-1 rounded">HIGH</span>}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-200">{proc.name}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-blue-300 border border-slate-800">
                        {proc.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 max-w-sm truncate text-slate-400 text-[11px]">
                      {proc.cmdline || "N/A"}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${proc.cpu_percent > 80 ? "text-rose-400 animate-pulse" : "text-blue-400"}`}>
                      {proc.cpu_percent}%
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-400">
                      {proc.memory_mb} MB
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedProc(proc)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px]"
                          title="Inspect Details"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => handleKill(proc.pid, proc.name)}
                          className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[10px]"
                          title="Kill Process"
                        >
                          Kill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Drawer Modal */}
      {selectedProc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="analytics-panel max-w-xl w-full p-5 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-slate-200 text-sm font-bold">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Process Inspection - PID #{selectedProc.pid}</span>
              </div>
              <button 
                onClick={() => setSelectedProc(null)} 
                className="text-slate-400 hover:text-slate-100 text-xs"
              >
                [Close]
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#070a11] p-3 rounded border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">NAME:</span>
                  <span className="text-slate-200 font-bold">{selectedProc.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CATEGORY:</span>
                  <span className="text-blue-400 font-bold">{selectedProc.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CPU USAGE:</span>
                  <span className="text-blue-400 font-bold">{selectedProc.cpu_percent}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MEMORY (RAM):</span>
                  <span className="text-emerald-400 font-bold">{selectedProc.memory_mb} MB ({selectedProc.memory_percent}%)</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1 text-[11px]">Command Line Input:</span>
                <pre className="p-3 bg-[#050811] rounded border border-slate-800 text-slate-300 text-[11px] whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {selectedProc.cmdline}
                </pre>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedProc(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleKill(selectedProc.pid, selectedProc.name)}
                className="px-3 py-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Terminate PID {selectedProc.pid}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
