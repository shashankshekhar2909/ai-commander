"use client";

import { useEffect, useState } from "react";
import { 
  MessageSquareCode, 
  Search, 
  Star, 
  Copy, 
  Check, 
  Clock, 
  Tag
} from "lucide-react";
import { 
  fetchPrompts, 
  toggleFavoritePrompt, 
  fetchPromptAnalytics, 
  PromptItem 
} from "@/lib/api";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const [data, stats] = await Promise.all([
        fetchPrompts(search, "", favoriteOnly),
        fetchPromptAnalytics().catch(() => null)
      ]);
      setPrompts(data.prompts || []);
      if (stats) setAnalytics(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadPrompts(), 300);
    return () => clearTimeout(timer);
  }, [search, favoriteOnly]);

  const handleToggleFav = async (id: number) => {
    try {
      await toggleFavoritePrompt(id);
      loadPrompts();
    } catch (e) {
      alert("Failed to toggle bookmark");
    }
  };

  const copyPrompt = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <MessageSquareCode className="w-4 h-4 text-purple-400" />
            AI Prompt Vault & Indexer
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Indexed prompt database recorded across AI agent sessions.
          </p>
        </div>

        <button
          onClick={() => setFavoriteOnly(!favoriteOnly)}
          className={`px-3 py-1.5 rounded text-xs border transition-colors flex items-center gap-1.5 ${
            favoriteOnly
              ? "bg-amber-950/60 text-amber-300 border-amber-800"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${favoriteOnly ? "fill-amber-400 text-amber-400" : ""}`} />
          {favoriteOnly ? "Bookmarked Only" : "Filter Bookmarks"}
        </button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="analytics-card p-3">
            <span className="text-[10px] text-slate-500 block">TOTAL PROMPTS</span>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{analytics.total_prompts}</div>
          </div>
          <div className="analytics-card p-3">
            <span className="text-[10px] text-slate-500 block">BOOKMARKED</span>
            <div className="text-lg font-bold text-amber-400 mt-0.5">{analytics.favorite_prompts}</div>
          </div>
          <div className="analytics-card p-3">
            <span className="text-[10px] text-slate-500 block">AVG LENGTH</span>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">{analytics.avg_prompt_length} chars</div>
          </div>
          <div className="analytics-card p-3">
            <span className="text-[10px] text-slate-500 block">CATEGORIES</span>
            <div className="text-xs text-slate-300 mt-1 font-sans">
              {analytics.category_breakdown?.Coding || 0} Code / {analytics.category_breakdown?.Debugging || 0} Debug
            </div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter prompts by keyword, text, or session ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded px-3 pl-9 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Prompts Data Feed */}
      <div className="space-y-2.5">
        {loading && prompts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-mono">
            Loading prompt inventory...
          </div>
        ) : prompts.length === 0 ? (
          <div className="analytics-panel p-8 text-center text-slate-500 text-xs font-mono">
            No matching prompts found in database.
          </div>
        ) : (
          prompts.map((p) => (
            <div 
              key={p.id} 
              className="analytics-panel p-3.5 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{new Date(p.timestamp * 1000).toLocaleString()}</span>
                  {p.conversation_id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      Session: {p.conversation_id.slice(0, 10)}...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleFav(p.id)}
                    className="hover:text-amber-400 transition-colors"
                    title="Bookmark Prompt"
                  >
                    <Star className={`w-3.5 h-3.5 ${p.is_favorite ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
                  </button>

                  <button
                    onClick={() => copyPrompt(p.prompt_text, p.id)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1 transition-colors"
                  >
                    {copiedId === p.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    {copiedId === p.id ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="code-block p-3 rounded text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {p.prompt_text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
