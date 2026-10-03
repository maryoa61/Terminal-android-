import React from 'react';
import { Camera, Bug, FileSearch, Activity, Smartphone, Sparkles, Terminal, History } from 'lucide-react';

interface QuickChipsProps {
  onRunCommand: (cmd: string) => void;
  onOpenCamera: () => void;
  onOpenCodeStudio?: () => void;
  onOpenDebugConsole?: () => void;
  onOpenOcrStudio?: () => void;
  onOpenHistory?: () => void;
}

export function QuickChips({
  onRunCommand,
  onOpenCamera,
  onOpenCodeStudio,
  onOpenDebugConsole,
  onOpenOcrStudio,
  onOpenHistory,
}: QuickChipsProps) {
  const chips = [
    {
      label: 'Command History',
      icon: History,
      action: 'history',
      color: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/30 font-semibold',
    },
    {
      label: 'Code Studio (IDE)',
      icon: Terminal,
      action: 'code-studio',
      color: 'border-emerald-500/60 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 font-bold',
    },
    {
      label: 'Debug Console (jdb)',
      icon: Bug,
      action: 'debug-console',
      color: 'border-amber-500/60 text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 font-bold',
    },
    {
      label: 'OCR Studio (Extract)',
      icon: FileSearch,
      action: 'ocr-studio',
      color: 'border-sky-500/60 text-sky-300 bg-sky-950/40 hover:bg-sky-900/40 font-bold',
    },
    {
      label: 'Node.js REPL',
      icon: Terminal,
      cmd: 'node',
      color: 'border-green-500/40 text-green-400 bg-green-950/20 hover:bg-green-900/30',
    },
    {
      label: 'Python 3 REPL',
      icon: Terminal,
      cmd: 'python',
      color: 'border-yellow-500/40 text-yellow-400 bg-yellow-950/20 hover:bg-yellow-900/30',
    },
    {
      label: 'Debug Crash Screenshot',
      icon: Bug,
      cmd: 'debug /sdcard/DCIM/Screenshots/error_stacktrace.png',
      color: 'border-amber-500/40 text-amber-400 bg-amber-950/20 hover:bg-amber-900/30',
    },
    {
      label: 'OCR Receipt Sample',
      icon: FileSearch,
      cmd: 'ocr /sdcard/DCIM/receipt_ocr_sample.png',
      color: 'border-sky-500/40 text-sky-400 bg-sky-950/20 hover:bg-sky-900/30',
    },
    {
      label: 'Camera Scanner',
      icon: Camera,
      action: 'camera',
      color: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-800/30',
    },
    {
      label: 'ADB Logcat',
      icon: Smartphone,
      cmd: 'adb logcat',
      color: 'border-teal-500/40 text-teal-400 bg-teal-950/20 hover:bg-teal-900/30',
    },
    {
      label: 'neofetch',
      icon: Terminal,
      cmd: 'neofetch',
      color: 'border-zinc-700 text-zinc-300 bg-zinc-900 hover:bg-zinc-800',
    },
    {
      label: 'top',
      icon: Activity,
      cmd: 'top',
      color: 'border-zinc-700 text-zinc-300 bg-zinc-900 hover:bg-zinc-800',
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-3 bg-zinc-950 border-b border-zinc-800/80 text-[11px] font-mono select-none">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex-shrink-0 flex items-center gap-1 mr-1">
        <Sparkles className="w-3 h-3 text-amber-400" />
        Quick:
      </span>
      {chips.map((chip, idx) => {
        const Icon = chip.icon;
        return (
          <button
            key={idx}
            onClick={() => {
              if (chip.action === 'camera') {
                onOpenCamera();
              } else if (chip.action === 'history') {
                if (onOpenHistory) onOpenHistory();
                else onRunCommand('history');
              } else if (chip.action === 'code-studio' && onOpenCodeStudio) {
                onOpenCodeStudio();
              } else if (chip.action === 'debug-console' && onOpenDebugConsole) {
                onOpenDebugConsole();
              } else if (chip.action === 'ocr-studio' && onOpenOcrStudio) {
                onOpenOcrStudio();
              } else if (chip.cmd) {
                onRunCommand(chip.cmd);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium whitespace-nowrap transition active:scale-95 flex-shrink-0 ${chip.color}`}
          >
            <Icon className="w-3 h-3 flex-shrink-0" />
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
