import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Bug,
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  FileCode,
  FolderOpen,
  Sparkles,
  Terminal,
  Loader2,
  Maximize2,
  Minimize2,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { globalVFS } from '../utils/vfs';
import { playReturnSound, playSuccessSound, playBellSound, playKeySound } from '../utils/sound';

interface CodeStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: string;
  onOpenInDebugger: (code: string, fileName: string) => void;
  onRunInTerminal: (command: string) => void;
}

interface OpenFile {
  name: string;
  path: string;
  content: string;
  isModified: boolean;
  language: 'javascript' | 'python' | 'kotlin' | 'bash' | 'text';
}

const TEMPLATES = {
  javascript: `// AndroTerm Pro - JavaScript Sandbox
function main() {
  console.log('🚀 Running on Android Termux Engine');
  
  const numbers = [12, 45, 78, 23, 56, 89];
  const total = numbers.reduce((acc, n) => acc + n, 0);
  const avg = (total / numbers.length).toFixed(2);
  
  console.log('Numbers:', numbers);
  console.log('Sum:', total);
  console.log('Average:', avg);
  
  return { total, avg };
}

main();`,
  python: `# AndroTerm Pro - Python 3.12 Engine
import sys

def calculate_stats(data):
    print("[*] Processing Android telemetry dataset...")
    count = len(data)
    max_val = max(data)
    min_val = min(data)
    print(f"[✓] Records analyzed: {count}")
    print(f"[✓] Peak signal: {max_val} dBm | Floor: {min_val} dBm")
    return {"count": count, "max": max_val}

samples = [-84, -72, -65, -92, -58]
calculate_stats(samples)
print("Process completed successfully.")`,
  kotlin: `// Android Jetpack / Kotlin Activity Snippet
package com.androterm.app

class TerminalActivity {
    private var isConnected: Boolean = true

    fun initializeSession(sessionId: String) {
        println("Binding to Android Terminal daemon...")
        val port = 3000
        println("Terminal connected on port $port")
    }
}

val activity = TerminalActivity()
activity.initializeSession("tty-01")`,
  bash: `#!/bin/bash
# Android Shell Automation Script
echo "[*] Checking battery level: 94% (Charging)"
echo "[*] Android device model: Pixel 9 Pro (Tensor G4)"
echo "[*] SELinux Mode: Enforcing"
echo "[*] Storage available in /sdcard: 214 GB free"
uptime`,
};

export function CodeStudio({
  isOpen,
  onClose,
  initialFile = 'projects/buggy_app.js',
  onOpenInDebugger,
  onRunInTerminal,
}: CodeStudioProps) {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([
    {
      name: 'buggy_app.js',
      path: '/home/user/projects/buggy_app.js',
      content: '',
      isModified: false,
      language: 'javascript',
    },
  ]);
  const [activeFilePath, setActiveFilePath] = useState<string>('/home/user/projects/buggy_app.js');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isAiFixing, setIsAiFixing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [newLang, setNewLang] = useState<'javascript' | 'python' | 'kotlin' | 'bash'>('javascript');

  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Load initial files from VFS
  useEffect(() => {
    if (!isOpen) return;

    const fullPath = initialFile.startsWith('/') ? initialFile : `/home/user/${initialFile}`;
    const file = globalVFS.readFile(fullPath);
    const fileName = fullPath.slice(fullPath.lastIndexOf('/') + 1);

    const lang: OpenFile['language'] = fileName.endsWith('.py')
      ? 'python'
      : fileName.endsWith('.kt')
      ? 'kotlin'
      : fileName.endsWith('.sh')
      ? 'bash'
      : 'javascript';

    if (file) {
      setOpenFiles([
        {
          name: fileName,
          path: fullPath,
          content: file.content,
          isModified: false,
          language: lang,
        },
      ]);
      setActiveFilePath(fullPath);
    } else {
      // Default to buggy_app.js
      const defaultContent = globalVFS.readFile('/home/user/projects/buggy_app.js')?.content || TEMPLATES.javascript;
      setOpenFiles([
        {
          name: 'buggy_app.js',
          path: '/home/user/projects/buggy_app.js',
          content: defaultContent,
          isModified: false,
          language: 'javascript',
        },
      ]);
      setActiveFilePath('/home/user/projects/buggy_app.js');
    }
  }, [isOpen, initialFile]);

  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollTop = consoleBottomRef.current.scrollHeight;
    }
  }, [consoleOutput]);

  if (!isOpen) return null;

  const activeFile = openFiles.find((f) => f.path === activeFilePath) || openFiles[0];

  const handleContentChange = (val: string) => {
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.path === activeFilePath ? { ...f, content: val, isModified: true } : f
      )
    );
  };

  const handleSave = () => {
    if (!activeFile) return;
    globalVFS.writeFile(activeFile.path, activeFile.content);
    setOpenFiles((prev) =>
      prev.map((f) => (f.path === activeFilePath ? { ...f, isModified: false } : f))
    );
    playSuccessSound();
    setConsoleOutput((prev) => [...prev, `[✓] Saved file to ${activeFile.path}`]);
  };

  const handleRunCode = async () => {
    if (!activeFile) return;
    setIsRunning(true);
    playReturnSound();
    const startTime = performance.now();

    setConsoleOutput([`[Running ${activeFile.name} on AndroTerm Runtime...]`]);

    if (activeFile.language === 'javascript') {
      const logs: string[] = [];
      const customConsole = {
        log: (...args: any[]) =>
          logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')),
        error: (...args: any[]) =>
          logs.push(`[ERROR] ` + args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')),
        warn: (...args: any[]) =>
          logs.push(`[WARN] ` + args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')),
        info: (...args: any[]) =>
          logs.push(`[INFO] ` + args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')),
      };

      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('console', activeFile.content);
        fn(customConsole);
        const duration = Math.round(performance.now() - startTime);
        setExecutionTime(duration);
        setConsoleOutput((prev) => [
          ...prev,
          ...logs,
          `\n[Process completed with exit code 0 (${duration}ms)]`,
        ]);
        playSuccessSound();
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime);
        setExecutionTime(duration);
        playBellSound();
        setConsoleOutput((prev) => [
          ...prev,
          ...logs,
          `\n🚨 Uncaught Exception: ${err.name}: ${err.message}`,
          `    at ${activeFile.name}:line ?`,
          `\n💡 Suggestion: Click "Debug in Console" or "AI Fix" to diagnose and repair!`,
        ]);
      }
    } else if (activeFile.language === 'python') {
      setTimeout(() => {
        const duration = Math.round(performance.now() - startTime);
        setExecutionTime(duration);
        setConsoleOutput((prev) => [
          ...prev,
          `Python 3.12.2 (main, aarch64 Android)`,
          `[*] Executing ${activeFile.name}...`,
          `[*] Processing Android telemetry dataset...`,
          `[✓] Records analyzed: 5`,
          `[✓] Peak signal: -58 dBm | Floor: -92 dBm`,
          `Process completed successfully.`,
          `\n[Process completed with exit code 0 (${duration}ms)]`,
        ]);
        playSuccessSound();
      }, 350);
    } else {
      setTimeout(() => {
        const duration = Math.round(performance.now() - startTime);
        setExecutionTime(duration);
        setConsoleOutput((prev) => [
          ...prev,
          `[*] Checking battery level: 94% (Charging)`,
          `[*] Android device model: Pixel 9 Pro (Tensor G4)`,
          `[*] SELinux Mode: Enforcing`,
          `[*] Storage available in /sdcard: 214 GB free`,
          ` 22:25:10 up 4:18, 1 user, load average: 0.38, 0.42, 0.35`,
          `\n[Process completed with exit code 0 (${duration}ms)]`,
        ]);
        playSuccessSound();
      }, 300);
    }

    setIsRunning(false);
  };

  const handleDebugInConsole = () => {
    if (!activeFile) return;
    onOpenInDebugger(activeFile.content, activeFile.name);
    onClose();
  };

  const handleAiFix = async () => {
    if (!activeFile || isAiFixing) return;
    setIsAiFixing(true);
    playReturnSound();
    setConsoleOutput((prev) => [...prev, `\n[*] Asking Gemini 3.8 Flash to review and optimize code...`]);

    try {
      const res = await fetch('/api/terminal/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          context: `Code Studio optimization. File: ${activeFile.name}. Fix any runtime bugs or syntax issues.`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConsoleOutput((prev) => [...prev, data.report]);
        // Extract fixed code block if present
        const codeBlockMatch = data.report.match(/```(?:javascript|js|typescript|ts|python|kotlin|bash)?\n([\s\S]*?)\n```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          const newCode = codeBlockMatch[1].trim();
          handleContentChange(newCode);
          setConsoleOutput((prev) => [...prev, `\n[✓] Repaired code applied to editor! Click 'Run Code' to test.`]);
          playSuccessSound();
        }
      }
    } catch (e: any) {
      setConsoleOutput((prev) => [...prev, `[AI Error]: ${e.message}`]);
    } finally {
      setIsAiFixing(false);
    }
  };

  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    let cleanName = newFileName.trim();
    const ext = newLang === 'python' ? '.py' : newLang === 'kotlin' ? '.kt' : newLang === 'bash' ? '.sh' : '.js';
    if (!cleanName.includes('.')) {
      cleanName += ext;
    }

    const fullPath = `/home/user/projects/${cleanName}`;
    const templateContent = TEMPLATES[newLang];
    globalVFS.writeFile(fullPath, templateContent);

    setOpenFiles((prev) => [
      ...prev,
      {
        name: cleanName,
        path: fullPath,
        content: templateContent,
        isModified: false,
        language: newLang,
      },
    ]);
    setActiveFilePath(fullPath);
    setShowNewModal(false);
    setNewFileName('');
    playSuccessSound();
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openFiles.length === 1) return; // Keep at least one tab
    const nextFiles = openFiles.filter((f) => f.path !== path);
    setOpenFiles(nextFiles);
    if (activeFilePath === path) {
      setActiveFilePath(nextFiles[0].path);
    }
  };

  const lines = activeFile?.content ? activeFile.content.split('\n') : [''];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 font-mono animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-6xl bg-zinc-950 border border-emerald-500/40 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[92vh]">
        {/* IDE Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-emerald-400">ANDRO-CODE STUDIO // INTEGRATED DEVELOPER WORKBENCH</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Bar & Action Toolbar */}
        <div className="px-3 py-1.5 bg-zinc-900/70 border-b border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          {/* File Tabs */}
          <div className="flex items-center gap-1">
            {openFiles.map((file) => {
              const isActive = file.path === activeFilePath;
              return (
                <div
                  key={file.path}
                  onClick={() => {
                    setActiveFilePath(file.path);
                    playReturnSound();
                  }}
                  className={`flex items-center gap-2 px-3 py-1 rounded-t-md text-xs cursor-pointer transition border-b-2 ${
                    isActive
                      ? 'bg-zinc-950 text-emerald-300 font-bold border-emerald-400'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-transparent'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  {file.isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {openFiles.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(file.path, e)}
                      className="hover:text-rose-400 text-zinc-500 rounded p-0.5 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => setShowNewModal(true)}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
              title="Create new file"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded transition shadow-sm active:scale-98"
              title="Run code in sandbox (Ctrl+Enter)"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-black" />}
              <span>Run Code</span>
            </button>

            <button
              onClick={handleDebugInConsole}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded transition shadow-sm active:scale-98"
              title="Debug in Interactive Console"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Debug Console</span>
            </button>

            <button
              onClick={handleAiFix}
              disabled={isAiFixing}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 font-semibold text-xs rounded transition"
              title="AI Code Review & Auto-fix"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isAiFixing ? 'Checking...' : 'AI Review'}</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded transition"
              title="Save file (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Editor Main Grid */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[300px]">
          {/* Code Editor Body */}
          <div className="flex-1 flex overflow-hidden bg-black/95 relative">
            {/* Line Numbers Column */}
            <div className="w-10 sm:w-12 bg-zinc-950 text-zinc-600 text-right pr-2 py-3 select-none text-xs border-r border-zinc-800/80 font-mono overflow-hidden">
              {lines.map((_, i) => (
                <div key={i} className="leading-5 h-5">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Text Area */}
            <textarea
              ref={editorTextareaRef}
              value={activeFile?.content || ''}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const val = target.value;
                  const updated = val.substring(0, start) + '  ' + val.substring(end);
                  handleContentChange(updated);
                  setTimeout(() => {
                    target.selectionStart = target.selectionEnd = start + 2;
                  }, 0);
                } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  handleSave();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleRunCode();
                }
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="flex-1 bg-transparent text-zinc-100 p-3 text-xs sm:text-sm leading-5 font-mono resize-none focus:outline-none overflow-auto border-none select-text"
              placeholder="Write or paste your code here..."
            />
          </div>

          {/* Execution Output Console */}
          <div className="h-44 md:h-auto md:w-80 lg:w-96 bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col font-mono text-xs">
            <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Terminal className="w-3.5 h-3.5" />
                <span>OUTPUT STREAM</span>
                {executionTime !== null && (
                  <span className="text-zinc-500 font-normal">({executionTime}ms)</span>
                )}
              </div>
              <button
                onClick={() => setConsoleOutput([])}
                className="hover:text-zinc-200 text-zinc-500 text-[10px]"
              >
                Clear
              </button>
            </div>

            <div
              ref={consoleBottomRef}
              className="flex-1 overflow-y-auto p-3 text-zinc-300 space-y-1 select-text font-mono text-[11px] leading-relaxed bg-black/70"
            >
              {consoleOutput.length === 0 ? (
                <div className="text-zinc-600 text-xs py-4 text-center">
                  Press &quot;Run Code&quot; to execute and view stdout/stderr output.
                </div>
              ) : (
                consoleOutput.map((line, i) => (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap break-all ${
                      line.includes('Uncaught') || line.includes('[ERROR]') || line.includes('🚨')
                        ? 'text-rose-400 font-semibold'
                        : line.startsWith('[✓]')
                        ? 'text-emerald-400'
                        : line.startsWith('[*]')
                        ? 'text-sky-300'
                        : 'text-zinc-200'
                    }`}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>

            <div className="p-2 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500">
              <span>Lang: {activeFile?.language}</span>
              <span>{lines.length} lines</span>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-1.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Shortcuts: [Ctrl+S] Save • [Ctrl+Enter] Run • [Tab] Indent (2 spaces)</span>
          <span>Target Path: {activeFile?.path}</span>
        </div>
      </div>

      {/* New File Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleCreateNewFile}
            className="w-full max-w-sm bg-zinc-950 border border-zinc-700 rounded-xl p-4 space-y-4 font-mono text-xs"
          >
            <div className="flex items-center justify-between font-bold text-white border-b border-zinc-800 pb-2">
              <span>CREATE NEW SOURCE FILE</span>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">File Name:</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. data_processor.js"
                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Language Template:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'javascript', label: 'JavaScript' },
                  { id: 'python', label: 'Python 3' },
                  { id: 'kotlin', label: 'Kotlin (Android)' },
                  { id: 'bash', label: 'Shell (.sh)' },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setNewLang(l.id as any)}
                    className={`p-2 rounded border text-left text-xs ${
                      newLang === l.id
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded text-xs"
              >
                Create File
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
