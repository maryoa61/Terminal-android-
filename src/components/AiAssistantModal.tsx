import React, { useState } from 'react';
import { X, Sparkles, Send, Terminal, Loader2, ArrowRight } from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  cwd: string;
  onInsertCommand: (command: string) => void;
}

export function AiAssistantModal({ isOpen, onClose, cwd, onInsertCommand }: AiAssistantModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [extractedCommand, setExtractedCommand] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setExtractedCommand(null);

    try {
      const res = await fetch('/api/terminal/ai-shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          cwd,
          os: 'Android 15 (Linux 6.1 aarch64)',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.answer);
        // Try extracting single-line command from markdown code fences if present
        const match = data.answer.match(/```(?:bash|sh)?\n([\s\S]*?)\n```/);
        if (match && match[1]) {
          setExtractedCommand(match[1].trim());
        }
      } else {
        setResult('Error: ' + (data.error || 'Failed to query assistant'));
      }
    } catch (err: any) {
      setResult('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCommand = (cmd: string) => {
    onInsertCommand(cmd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-indigo-500/40 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>AI TERMINAL ASSISTANT // NATURAL LANGUAGE</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Query Input */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="text-xs text-zinc-400 mb-2">
            Ask any Linux / Android command question (e.g. &quot;how to filter logcat by error&quot;, &quot;find all png files in sdcard&quot;):
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Find all files larger than 10MB in /sdcard"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Ask</span>
            </button>
          </div>
        </form>

        {/* Result Area */}
        <div className="p-4 max-h-[50vh] overflow-y-auto text-xs text-zinc-300 space-y-3 leading-relaxed">
          {loading && (
            <div className="flex items-center gap-2 text-indigo-400 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Consulting Gemini 3.8 Flash...</span>
            </div>
          )}

          {result && (
            <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 whitespace-pre-wrap">
              {result}
            </div>
          )}

          {extractedCommand && (
            <div className="bg-indigo-950/40 border border-indigo-500/40 p-3 rounded-lg flex items-center justify-between gap-3">
              <div className="font-mono text-xs text-indigo-200 truncate flex-1">
                <code>$ {extractedCommand}</code>
              </div>
              <button
                onClick={() => handleUseCommand(extractedCommand)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-black text-xs font-bold rounded transition flex-shrink-0"
              >
                <span>Run</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
