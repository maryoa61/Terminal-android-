import React from 'react';
import { Camera, Clipboard, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, Sparkles, Code, Bug, History } from 'lucide-react';
import { playKeySound } from '../utils/sound';

interface AndroidSoftKeyboardProps {
  onInsertText: (char: string) => void;
  onSpecialKey: (key: 'TAB' | 'ESC' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'ENTER' | 'CLEAR') => void;
  ctrlActive: boolean;
  altActive: boolean;
  onToggleCtrl: () => void;
  onToggleAlt: () => void;
  onOpenCamera: () => void;
  onPasteClipboard: () => void;
  onAiPrompt: () => void;
  onOpenCodeStudio?: () => void;
  onOpenDebugConsole?: () => void;
  onOpenHistory?: () => void;
}

export function AndroidSoftKeyboard({
  onInsertText,
  onSpecialKey,
  ctrlActive,
  altActive,
  onToggleCtrl,
  onToggleAlt,
  onOpenCamera,
  onPasteClipboard,
  onAiPrompt,
  onOpenCodeStudio,
  onOpenDebugConsole,
  onOpenHistory,
}: AndroidSoftKeyboardProps) {
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore
      }
    }
    playKeySound();
  };

  const handleKeyClick = (char: string) => {
    triggerHaptic();
    onInsertText(char);
  };

  const handleSpecial = (key: 'TAB' | 'ESC' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'ENTER' | 'CLEAR') => {
    triggerHaptic();
    onSpecialKey(key);
  };

  return (
    <div className="w-full bg-zinc-950/95 border-t border-zinc-800/80 px-2 py-1.5 flex flex-col gap-1.5 select-none touch-none backdrop-blur-sm">
      {/* Primary Termux-style action row */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onToggleCtrl();
          }}
          className={`px-2.5 py-1.5 rounded text-[11px] font-mono font-bold transition flex-shrink-0 ${
            ctrlActive
              ? 'bg-emerald-500 text-black shadow-sm shadow-emerald-500/50'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:bg-zinc-600'
          }`}
        >
          CTRL
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onToggleAlt();
          }}
          className={`px-2.5 py-1.5 rounded text-[11px] font-mono font-bold transition flex-shrink-0 ${
            altActive
              ? 'bg-amber-500 text-black shadow-sm shadow-amber-500/50'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:bg-zinc-600'
          }`}
        >
          ALT
        </button>

        <button
          type="button"
          onClick={() => handleSpecial('ESC')}
          className="px-2.5 py-1.5 rounded text-[11px] font-mono font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:bg-zinc-600 transition flex-shrink-0"
        >
          ESC
        </button>

        <button
          type="button"
          onClick={() => handleSpecial('TAB')}
          className="px-3 py-1.5 rounded text-[11px] font-mono font-bold bg-zinc-800 hover:bg-zinc-700 text-emerald-400 active:bg-zinc-600 transition flex-shrink-0 border border-emerald-500/20"
        >
          TAB
        </button>

        {/* Quick character buttons */}
        {['|', '/', '-', '~', '$', '"', ':'].map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => handleKeyClick(ch)}
            className="w-8 h-8 rounded text-[12px] font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 active:bg-zinc-700 transition flex items-center justify-center flex-shrink-0 border border-zinc-800"
          >
            {ch}
          </button>
        ))}

        {/* Navigation arrows */}
        <button
          type="button"
          onClick={() => handleSpecial('UP')}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:bg-zinc-600 transition flex items-center justify-center flex-shrink-0"
          title="Previous command"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleSpecial('DOWN')}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:bg-zinc-600 transition flex items-center justify-center flex-shrink-0"
          title="Next command"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleSpecial('LEFT')}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:bg-zinc-600 transition flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleSpecial('RIGHT')}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:bg-zinc-600 transition flex items-center justify-center flex-shrink-0"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Code Studio shortcut */}
        {onOpenCodeStudio && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onOpenCodeStudio();
            }}
            className="px-2.5 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-mono font-medium transition flex items-center gap-1 flex-shrink-0"
            title="Open Code Studio (IDE)"
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">IDE</span>
          </button>
        )}

        {/* Debug Console shortcut */}
        {onOpenDebugConsole && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onOpenDebugConsole();
            }}
            className="px-2.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-medium transition flex items-center gap-1 flex-shrink-0"
            title="Open Debug Console (jdb/gdb)"
          >
            <Bug className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DBG</span>
          </button>
        )}

        {/* Camera snapshot shortcut */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onOpenCamera();
          }}
          className="px-2.5 py-1.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/40 text-[11px] font-mono font-medium transition flex items-center gap-1 flex-shrink-0"
          title="Snap photo / OCR"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">CAM</span>
        </button>

        {/* Command History shortcut */}
        {onOpenHistory && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onOpenHistory();
            }}
            className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-mono font-medium transition flex items-center gap-1 flex-shrink-0"
            title="Command History (Ctrl+R)"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">HIST</span>
          </button>
        )}

        {/* AI Shell Assist */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onAiPrompt();
          }}
          className="px-2.5 py-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-mono font-medium transition flex items-center gap-1 flex-shrink-0"
          title="AI Terminal Assistant"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI</span>
        </button>

        {/* Paste from clipboard */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onPasteClipboard();
          }}
          className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:bg-zinc-600 transition flex items-center justify-center flex-shrink-0"
          title="Paste from clipboard"
        >
          <Clipboard className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
