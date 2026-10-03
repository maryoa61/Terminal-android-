import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  History,
  Search,
  Play,
  CornerDownRight,
  Copy,
  Check,
  Trash2,
  Terminal,
  ArrowUpDown,
  Clock,
  Sparkles,
  Command,
} from 'lucide-react';
import { playReturnSound, playKeySound } from '../utils/sound';

interface CommandHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: string[];
  onExecuteCommand: (command: string) => void;
  onInsertToInput?: (command: string) => void;
  onClearHistory?: () => void;
}

export function CommandHistoryModal({
  isOpen,
  onClose,
  history,
  onExecuteCommand,
  onInsertToInput,
  onClearHistory,
}: CommandHistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Prepared list with original index
  const preparedHistory = useMemo(() => {
    const items = history.map((cmd, idx) => ({
      command: cmd,
      originalIndex: idx + 1,
    }));

    if (sortOrder === 'newest') {
      return [...items].reverse();
    }
    return items;
  }, [history, sortOrder]);

  // Filtered list based on search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return preparedHistory;
    const q = searchQuery.toLowerCase().trim();
    return preparedHistory.filter((item) =>
      item.command.toLowerCase().includes(q)
    );
  }, [preparedHistory, searchQuery]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, sortOrder]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      ) as HTMLElement | null;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation inside modal: Esc, Up/Down, Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (filteredHistory.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        playKeySound();
        setSelectedIndex((prev) => (prev + 1) % filteredHistory.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        playKeySound();
        setSelectedIndex((prev) =>
          prev === 0 ? filteredHistory.length - 1 : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredHistory[selectedIndex];
        if (selected) {
          handleExecute(selected.command);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredHistory, selectedIndex]);

  if (!isOpen) return null;

  const handleExecute = (cmd: string) => {
    playReturnSound();
    onExecuteCommand(cmd);
    onClose();
  };

  const handleInsert = (e: React.MouseEvent, cmd: string) => {
    e.stopPropagation();
    playKeySound();
    if (onInsertToInput) {
      onInsertToInput(cmd);
    }
    onClose();
  };

  const handleCopy = (e: React.MouseEvent, cmd: string, idx: number) => {
    e.stopPropagation();
    playKeySound();
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Preset quick commands if history is empty
  const sampleCommands = [
    'neofetch',
    'ls -la',
    'ocr /sdcard/DCIM/receipt_ocr_sample.png',
    'debug projects/buggy_app.js',
    'adb devices',
    'top',
    'cat /etc/os-release',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] sm:max-h-[82vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/90 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="history-modal-title" className="text-sm font-bold tracking-tight text-white">
                  Command History
                </h2>
                <span className="text-xs text-zinc-500">·</span>
                <span className="text-xs text-zinc-400 font-normal">
                  {history.length} {history.length === 1 ? 'command' : 'commands'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-normal hidden sm:block mt-0.5">
                Click any past command to instantly re-execute in terminal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sort Order Toggle */}
            <button
              onClick={() =>
                setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
              }
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs transition flex items-center gap-1"
              title={`Switch sort order (currently ${sortOrder} first)`}
            >
              <ArrowUpDown className="w-3 h-3 text-zinc-400" />
              <span className="text-[11px] capitalize">{sortOrder}</span>
            </button>

            {/* Clear History */}
            {onClearHistory && history.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all commands from history?')) {
                    onClearHistory();
                  }
                }}
                className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                title="Clear command history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition ml-1"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-zinc-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past commands (e.g. ls, debug, ocr, adb)..."
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30 transition"
              spellCheck={false}
              autoCapitalize="off"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-zinc-500 hover:text-zinc-300 p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 hidden sm:inline flex-shrink-0">
            {filteredHistory.length} of {history.length}
          </span>
        </div>

        {/* Command History List Container */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 divide-y divide-zinc-900"
          style={{ minHeight: '260px' }}
        >
          {filteredHistory.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center text-zinc-500">
              <Command className="w-8 h-8 text-zinc-600 mb-2 opacity-50" />
              {searchQuery ? (
                <>
                  <p className="text-xs text-zinc-400">
                    No matching commands found for "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-emerald-400 hover:underline"
                  >
                    Clear search filter
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-zinc-400 mb-1">
                    Your command history is currently empty
                  </p>
                  <p className="text-[11px] text-zinc-600 max-w-sm mb-4">
                    Commands executed in the shell or REPL will appear here for fast re-execution.
                  </p>
                  <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3 text-left">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-2">
                      Try executing a suggested command:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sampleCommands.map((sample) => (
                        <button
                          key={sample}
                          onClick={() => handleExecute(sample)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-500/40 border border-zinc-700/60 text-xs text-zinc-300 font-mono transition flex items-center gap-1"
                        >
                          <Play className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{sample}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            filteredHistory.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${item.originalIndex}-${item.command}-${index}`}
                  data-index={index}
                  onClick={() => handleExecute(item.command)}
                  className={`group relative flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-zinc-800/90 text-white border border-emerald-500/50 shadow-sm'
                      : 'hover:bg-zinc-900/80 text-zinc-300 border border-transparent'
                  }`}
                  title="Click to re-execute in terminal"
                >
                  {/* Left: Command Number & Command Text */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-[10px] text-zinc-500 w-7 flex-shrink-0 font-mono text-right">
                      #{item.originalIndex}
                    </span>
                    <span className="text-emerald-500 font-bold select-none text-xs flex-shrink-0">
                      $
                    </span>
                    <span className="font-mono text-xs truncate text-zinc-200 group-hover:text-emerald-300 font-medium">
                      {item.command}
                    </span>
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Run Pill Badge (Appears on Hover / Selection) */}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded transition items-center gap-1 ${
                        isSelected
                          ? 'flex bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                          : 'hidden group-hover:flex bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      <Play className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                      <span>Execute</span>
                    </span>

                    {/* Insert to input buffer without running */}
                    {onInsertToInput && (
                      <button
                        type="button"
                        onClick={(e) => handleInsert(e, item.command)}
                        className="p-1.5 rounded text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition"
                        title="Insert into command prompt (edit before running)"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Copy to clipboard */}
                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, item.command, index)}
                      className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                      title="Copy command"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-[11px] text-zinc-500 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">
                Click / Enter
              </kbd>
              <span>Re-execute</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">
                ↑ ↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">
                Esc
              </kbd>
              <span>Close</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-zinc-400">
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>Shortcut: Ctrl + R</span>
          </div>
        </div>
      </div>
    </div>
  );
}
