const API_BASE = "http://localhost:8000";

export interface SystemStats {
  cpu_percent: number;
  cpu_count: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  disk_free_gb: number;
  timestamp: number;
}

export interface AIProcess {
  pid: number;
  name: string;
  cmdline: string;
  cpu_percent: number;
  memory_percent: number;
  memory_mb: number;
  status: string;
  uptime_seconds: number;
  user: string;
  category: string;
  is_ai: boolean;
}

export interface AISession {
  conversation_id: string;
  path: string;
  first_prompt: string;
  latest_prompt: string;
  step_count: number;
  tool_calls_count: number;
  subagents_count: number;
  last_updated: number;
  status: string;
}

export interface PromptItem {
  id: number;
  conversation_id: string;
  prompt_text: string;
  category: string;
  tags: string[];
  is_favorite: boolean;
  timestamp: number;
  response_notes: string;
}

export interface LogStep {
  line_no: number;
  step_index: number;
  type: string;
  source: string;
  content: string;
  tool_calls?: any[];
  is_truncated?: boolean;
}

export interface SessionLogsResponse {
  conversation_id: string;
  total_steps: number;
  user_prompts: { line_no: number; prompt: string }[];
  tool_history: { line_no: number; name: string; summary: string; args: any }[];
  steps: LogStep[];
}

export async function fetchSystemStats(): Promise<SystemStats> {
  const res = await fetch(`${API_BASE}/api/system/stats`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch system stats");
  return res.json();
}

export async function fetchProcesses(showAll: boolean = false): Promise<{ count: number; processes: AIProcess[] }> {
  const res = await fetch(`${API_BASE}/api/processes?all=${showAll}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch running processes");
  return res.json();
}

export async function killProcess(pid: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/processes/${pid}/kill`, { method: "POST" });
  return res.json();
}

export async function fetchSessions(): Promise<{ count: number; sessions: AISession[] }> {
  const res = await fetch(`${API_BASE}/api/sessions`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch AI sessions");
  return res.json();
}

export async function fetchSessionLogs(sessionId: string, limit: number = 200): Promise<SessionLogsResponse> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/logs?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch session logs");
  return res.json();
}

export async function fetchPrompts(search: string = "", category: string = "", favoriteOnly: boolean = false): Promise<{ count: number; prompts: PromptItem[] }> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (category) params.append("category", category);
  if (favoriteOnly) params.append("favorite_only", "true");
  
  const res = await fetch(`${API_BASE}/api/prompts?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch prompts");
  return res.json();
}

export async function toggleFavoritePrompt(promptId: number): Promise<{ success: boolean; is_favorite: boolean }> {
  const res = await fetch(`${API_BASE}/api/prompts/${promptId}/favorite`, { method: "POST" });
  return res.json();
}

export async function fetchPromptAnalytics(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/prompts/analytics`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch prompt analytics");
  return res.json();
}

export async function runCommanderCommand(command: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/commander/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command })
  });
  return res.json();
}

export async function fetchCommanderTasks(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/commander/tasks`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch commander tasks");
  return res.json();
}
