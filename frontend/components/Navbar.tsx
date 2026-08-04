"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Cpu, 
  MessageSquareCode, 
  ScrollText, 
  Terminal,
  Activity,
  Server
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket("ws://localhost:8000/ws/live");
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
    } catch (e) {
      setWsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Processes & Tasks", href: "/tasks", icon: Cpu },
    { name: "Prompts Vault", href: "/prompts", icon: MessageSquareCode },
    { name: "Agent Transcripts", href: "/logs", icon: ScrollText },
    { name: "Commander Console", href: "/commander", icon: Terminal },
  ];

  return (
    <header className="bg-[#0f172a] border-b border-slate-800 px-6 py-2.5">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-xs">
              AI
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100 tracking-tight">
                AI COMMANDER
              </span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded uppercase">
                Analytics
              </span>
            </div>
          </Link>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-slate-800 text-blue-400 border border-slate-700"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* System Telemetry Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>localhost:8000</span>
            <span className="text-slate-600">|</span>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
            <span className={wsConnected ? "text-emerald-400" : "text-amber-400"}>
              {wsConnected ? "LIVE" : "POLLING"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
