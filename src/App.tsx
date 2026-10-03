import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  Camera,
  FolderOpen,
  Settings,
  Sparkles,
  Plus,
  X,
  Volume2,
  VolumeX,
  Wifi,
  BatteryCharging,
  Cpu,
  RefreshCw,
  Bug,
  FileSearch,
  Upload,
  History,
} from 'lucide-react';
import { useTerminal, getPromptPrefix } from './hooks/useTerminal';
import { THEMES } from './utils/themes';
import { ThemeName } from './types/terminal';
import { globalVFS } from './utils/vfs';
import { playKeySound, isSoundEnabled, setSoundEnabled, playSuccessSound } from './utils/sound';

import { TerminalOutput } from './components/TerminalOutput';
import { AndroidSoftKeyboard } from './components/AndroidSoftKeyboard';
import { QuickChips } from './components/QuickChips';
import { CameraModal } from './components/CameraModal';
import { NanoEditor } from './components/NanoEditor';
import { TopMonitor } from './components/TopMonitor';
import { ImageModal } from './components/ImageModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { SettingsModal } from './components/SettingsModal';
import { FileDrawer } from './components/FileDrawer';
import { CodeStudio } from './components/CodeStudio';
import { DebugConsole } from './components/DebugConsole';
import { OcrStudioModal } from './components/OcrStudioModal';
import { CommandHistoryModal } from './components/CommandHistoryModal';

export default function App() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    inputBuffer,
    setInputBuffer,
    isExecuting,
    executeCommand,
    clearScreen,
    addLines,
    nanoFile,
    setNanoFile,
    showTop,
    setShowTop,
    showCamera,
    setShowCamera,
    previewImage,
    setPreviewImage,
    showAiModal,
    setShowAiModal,
    showCodeStudio,
    setShowCodeStudio,
    activeCodeStudioFile,
    setActiveCodeStudioFile,
    showDebugConsole,
    setShowDebugConsole,
    activeDebugTarget,
    setActiveDebugTarget,
    activeDebugCode,
    setActiveDebugCode,
    showOcrStudio,
    setShowOcrStudio,
    showHistoryModal,
    setShowHistoryModal,
    clearHistory,
  } = useTerminal();

  // Settings state
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('termux');
  const [crtEffect, setCrtEffect] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [promptStyle, setPromptStyle] = useState<'termux' | 'root' | 'ubuntu'>('termux');
  const [showSettings, setShowSettings] = useState(false);
  const [showFileDrawer, setShowFileDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Softkey modifier states
  const [ctrlActive, setCtrlActive] = useState(false);
  const [altActive, setAltActive] = useState(false);

  // Terminal DOM refs
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const theme = THEMES[currentTheme];

  // Auto-scroll terminal viewport to bottom when new lines appear
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [activeSession?.lines, inputBuffer, isExecuting]);

  // Keep input focused unless modal is open
  useEffect(() => {
    if (
      !nanoFile &&
      !showTop &&
      !showCamera &&
      !previewImage &&
      !showAiModal &&
      !showSettings &&
      !showFileDrawer &&
      !showCodeStudio &&
      !showDebugConsole &&
      !showOcrStudio &&
      !showHistoryModal
    ) {
      inputRef.current?.focus();
    }
  }, [
    nanoFile,
    showTop,
    showCamera,
    previewImage,
    showAiModal,
    showSettings,
    showFileDrawer,
    showCodeStudio,
    showDebugConsole,
    showOcrStudio,
    showHistoryModal,
  ]);

  // Handle Tab Autocompletion
  const handleAutocomplete = () => {
    if (!inputBuffer) return;
    const parts = inputBuffer.split(' ');
    const lastWord = parts[parts.length - 1];

    if (parts.length === 1) {
      // Autocomplete command name
      const commands = [
        'help', 'clear', 'ls', 'cd', 'cat', 'pwd', 'mkdir', 'rm', 'touch', 'echo',
        'neofetch', 'top', 'htop', 'camera', 'imgview', 'ocr', 'debug', 'sample-debug',
        'adb', 'node', 'python', 'nano', 'curl', 'ai', 'whoami', 'date', 'uptime', 'uname'
      ];
      const matches = commands.filter((c) => c.startsWith(lastWord));
      if (matches.length === 1) {
        setInputBuffer(matches[0] + ' ');
      } else if (matches.length > 1) {
        addLines([
          {
            id: `auto-${Date.now()}`,
            type: 'info',
            text: matches.join('   '),
            timestamp: Date.now(),
          },
        ]);
      }
    } else {
      // Autocomplete file path in current dir
      const dirItems = globalVFS.listDirectory(activeSession.cwd);
      const matches = dirItems.filter((i) => i.name.startsWith(lastWord));
      if (matches.length === 1) {
        parts[parts.length - 1] = matches[0].name + (matches[0].isDir ? '/' : ' ');
        setInputBuffer(parts.join(' '));
      } else if (matches.length > 1) {
        addLines([
          {
            id: `auto-${Date.now()}`,
            type: 'info',
            text: matches.map((m) => (m.isDir ? m.name + '/' : m.name)).join('   '),
            timestamp: Date.now(),
          },
        ]);
      }
    }
  };

  // Keyboard navigation & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    playKeySound();

    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(inputBuffer, promptStyle);
      setInputBuffer('');
      setCtrlActive(false);
      setAltActive(false);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      handleAutocomplete();
      return;
    }

    // Ctrl shortcuts
    if (e.ctrlKey || ctrlActive) {
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setInputBuffer('');
        addLines([
          {
            id: `ctrlc-${Date.now()}`,
            type: 'input',
            text: inputBuffer + '^C',
            timestamp: Date.now(),
          },
        ]);
        setCtrlActive(false);
        return;
      }
      if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        clearScreen();
        setCtrlActive(false);
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setShowHistoryModal(true);
        setCtrlActive(false);
        return;
      }
    }

    // History navigation with ArrowUp and ArrowDown
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = activeSession.history;
      if (history.length === 0) return;
      let newIdx = activeSession.historyIndex === -1 ? history.length - 1 : Math.max(0, activeSession.historyIndex - 1);
      activeSession.historyIndex = newIdx;
      setInputBuffer(history[newIdx] || '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const history = activeSession.history;
      if (history.length === 0 || activeSession.historyIndex === -1) return;
      let newIdx = activeSession.historyIndex + 1;
      if (newIdx >= history.length) {
        activeSession.historyIndex = -1;
        setInputBuffer('');
      } else {
        activeSession.historyIndex = newIdx;
        setInputBuffer(history[newIdx] || '');
      }
      return;
    }
  };

  // Handle special softkeys from Android keyboard
  const handleSpecialSoftKey = (key: 'TAB' | 'ESC' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'ENTER' | 'CLEAR') => {
    switch (key) {
      case 'TAB':
        handleAutocomplete();
        break;
      case 'ESC':
        setInputBuffer('');
        break;
      case 'CLEAR':
        clearScreen();
        break;
      case 'ENTER':
        executeCommand(inputBuffer, promptStyle);
        setInputBuffer('');
        setCtrlActive(false);
        setAltActive(false);
        break;
      case 'UP': {
        const history = activeSession.history;
        if (history.length === 0) return;
        let newIdx = activeSession.historyIndex === -1 ? history.length - 1 : Math.max(0, activeSession.historyIndex - 1);
        activeSession.historyIndex = newIdx;
        setInputBuffer(history[newIdx] || '');
        break;
      }
      case 'DOWN': {
        const history = activeSession.history;
        if (history.length === 0 || activeSession.historyIndex === -1) return;
        let newIdx = activeSession.historyIndex + 1;
        if (newIdx >= history.length) {
          activeSession.historyIndex = -1;
          setInputBuffer('');
        } else {
          activeSession.historyIndex = newIdx;
          setInputBuffer(history[newIdx] || '');
        }
        break;
      }
      case 'LEFT': {
        if (inputRef.current) {
          const pos = Math.max(0, (inputRef.current.selectionStart || 0) - 1);
          inputRef.current.setSelectionRange(pos, pos);
        }
        break;
      }
      case 'RIGHT': {
        if (inputRef.current) {
          const pos = Math.min(inputBuffer.length, (inputRef.current.selectionStart || 0) + 1);
          inputRef.current.setSelectionRange(pos, pos);
        }
        break;
      }
    }
    inputRef.current?.focus();
  };

  const handleInsertText = (char: string) => {
    setInputBuffer((prev) => prev + char);
    inputRef.current?.focus();
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputBuffer((prev) => prev + text);
    } catch {
      // Clipboard permission issue
    }
  };

  // Drag and Drop files onto terminal
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const targetPath = `${activeSession.cwd === '/' ? '' : activeSession.cwd}/${file.name}`;
        globalVFS.writeFile(targetPath, content, file.type);
        playSuccessSound();

        addLines([
          {
            id: `drop-${Date.now()}`,
            type: isImage ? 'image' : 'success',
            text: `[✓] Imported ${file.name} to ${targetPath}`,
            imageSrc: isImage ? content : undefined,
            imageAlt: file.name,
            timestamp: Date.now(),
          },
        ]);
      };

      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Photo captured from CameraModal
  const handleCameraCapture = (dataUrl: string, autoAction?: 'ocr' | 'debug') => {
    const timestamp = Date.now();
    const filename = `capture_${timestamp}.png`;
    const targetPath = `/sdcard/DCIM/${filename}`;
    globalVFS.writeFile(targetPath, dataUrl, 'image/png');

    addLines([
      {
        id: `cam-${timestamp}`,
        type: 'image',
        text: `[✓] Snapshot saved to ${targetPath}`,
        imageSrc: dataUrl,
        imageAlt: filename,
        timestamp,
      },
    ]);

    if (autoAction === 'ocr') {
      executeCommand(`ocr ${targetPath}`, promptStyle);
    } else if (autoAction === 'debug') {
      executeCommand(`debug ${targetPath}`, promptStyle);
    }
  };

  // Apply fix from AI debugger to file
  const handleApplyFixToFile = (targetFile: string, newCode: string) => {
    globalVFS.writeFile(targetFile, newCode);
    addLines([
      {
        id: `fix-${Date.now()}`,
        type: 'success',
        text: `\x1b[32;1m[✓] Successfully patched ${targetFile}! Run "cat ${targetFile}" to inspect.\x1b[0m`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Add new tab session
  const handleCreateNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      name: `bash [${sessions.length + 1}]`,
      history: [],
      historyIndex: -1,
      lines: [
        {
          id: `init-${newId}`,
          type: 'info' as const,
          text: `\x1b[32m[Session ${sessions.length + 1} initialized - tty${sessions.length + 1}]\x1b[0m\nReady for input.\n`,
          timestamp: Date.now(),
        },
      ],
      cwd: '/home/user',
      env: { USER: 'u0_a245', HOME: '/home/user', SHELL: '/bin/bash', TERM: 'xterm-256color' },
    };
    sessions.push(newSession);
    setActiveSessionId(newId);
  };

  return (
    <div
      className={`w-screen h-screen flex flex-col overflow-hidden select-none transition-colors duration-200 ${
        crtEffect ? 'crt-overlay' : ''
      }`}
      style={{ backgroundColor: theme.windowBg, color: theme.fg }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Top Application / Window Header Bar */}
      <header
        className="flex items-center justify-between px-3 py-2 border-b select-none flex-shrink-0 z-10"
        style={{ backgroundColor: theme.statusbarBg, borderColor: theme.border }}
      >
        {/* Left: Window controls & Brand */}
        <div className="flex items-center gap-3">
          {/* Window control dots */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={clearScreen}
              className="w-3 h-3 rounded-full bg-rose-500 hover:opacity-80 transition"
              title="Clear terminal (Ctrl+L)"
            />
            <button
              onClick={() => setShowSettings(true)}
              className="w-3 h-3 rounded-full bg-amber-500 hover:opacity-80 transition"
              title="Settings & Themes"
            />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-3 h-3 rounded-full bg-emerald-500 hover:opacity-80 transition"
              title="Toggle Fullscreen"
            />
          </div>

          {/* Sessions / Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-md">
            {sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition ${
                  sess.id === activeSessionId
                    ? 'bg-zinc-800 text-white font-bold border-b-2'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
                style={{
                  borderBottomColor: sess.id === activeSessionId ? theme.accent : 'transparent',
                }}
              >
                <TerminalIcon className="w-3 h-3 text-emerald-400" />
                <span>{sess.name}</span>
              </button>
            ))}

            <button
              onClick={handleCreateNewSession}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
              title="New Terminal Tab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Hardware status indicators & quick tool shortcuts */}
        <div className="flex items-center gap-2 text-xs">
          {/* Device badge */}
          <div className="hidden md:flex items-center gap-2 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Pixel 9 Pro / aarch64</span>
            <span className="text-zinc-600">|</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <BatteryCharging className="w-3.5 h-3.5" />
              <span>94%</span>
            </div>
            <Wifi className="w-3.5 h-3.5 text-sky-400" />
          </div>

          {/* Quick Action Icons */}
          <button
            onClick={() => setShowCodeStudio(true)}
            className="p-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/40 rounded transition flex items-center gap-1 font-mono text-xs font-semibold"
            title="Open Code Studio (IDE)"
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Code</span>
          </button>

          <button
            onClick={() => setShowDebugConsole(true)}
            className="p-1.5 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 rounded transition flex items-center gap-1 font-mono text-xs font-semibold"
            title="Open Debug Console (jdb/gdb)"
          >
            <Bug className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Debugger</span>
          </button>

          <button
            onClick={() => setShowOcrStudio(true)}
            className="p-1.5 bg-sky-950/60 hover:bg-sky-900/60 text-sky-400 border border-sky-500/40 rounded transition flex items-center gap-1 font-mono text-xs font-semibold"
            title="Open OCR Vision Studio"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OCR</span>
          </button>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition flex items-center gap-1 font-mono text-xs"
            title="Command History (Ctrl+R)"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={() => setShowCamera(true)}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition flex items-center gap-1 font-mono text-xs"
            title="Open Camera Scanner"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Camera</span>
          </button>

          <button
            onClick={() => setShowFileDrawer(true)}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition flex items-center gap-1 font-mono text-xs"
            title="Browse Files / SDCard"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Files</span>
          </button>

          <button
            onClick={() => setShowAiModal(true)}
            className="p-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 rounded transition"
            title="AI Terminal Assistant"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition"
            title="Workstation Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Quick Command Chips Toolbar */}
      <QuickChips
        onRunCommand={(cmd) => executeCommand(cmd, promptStyle)}
        onOpenCamera={() => setShowCamera(true)}
        onOpenCodeStudio={() => setShowCodeStudio(true)}
        onOpenDebugConsole={() => setShowDebugConsole(true)}
        onOpenOcrStudio={() => setShowOcrStudio(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
      />

      {/* Main Terminal Screen Area */}
      <div
        ref={terminalScrollRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto p-3 sm:p-4 font-mono transition-colors duration-200 relative cursor-text"
        style={{
          backgroundColor: theme.bg,
          fontSize: `${fontSize}px`,
          lineHeight: '1.5',
        }}
      >
        {/* Terminal Line Outputs */}
        <TerminalOutput
          lines={activeSession.lines}
          theme={theme}
          onOpenImage={(src, alt) => setPreviewImage({ src, alt })}
          onApplyFix={handleApplyFixToFile}
          onRunOcr={(imgSrc) => {
            executeCommand(`ocr /sdcard/DCIM/receipt_ocr_sample.png`, promptStyle);
          }}
          onRunDebug={(imgSrc) => {
            executeCommand(`debug /sdcard/DCIM/Screenshots/error_stacktrace.png`, promptStyle);
          }}
          onOpenInCodeStudio={(filename, code) => {
            setActiveCodeStudioFile(filename);
            setShowCodeStudio(true);
          }}
          onOpenInDebugger={(code, fileName) => {
            setActiveDebugTarget(fileName);
            setActiveDebugCode(code);
            setShowDebugConsole(true);
          }}
        />

        {/* Active Command Input Line */}
        <div className="flex items-center gap-1.5 mt-2 pt-1 font-mono">
          <span
            className="font-bold select-none flex-shrink-0"
            dangerouslySetInnerHTML={{
              __html: getPromptPrefix(activeSession.cwd, activeSession.env.USER, promptStyle)
                .replace(/\x1b\[[0-9;]+m/g, ''),
            }}
          />

          <div className="relative flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputBuffer}
              onChange={(e) => setInputBuffer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              autoFocus
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full bg-transparent text-inherit font-mono outline-none border-none p-0 focus:ring-0"
              style={{ caretColor: theme.cursorColor }}
            />
            {isExecuting && (
              <span className="w-2 h-4 bg-emerald-400 cursor-blink ml-1 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Loading Spinner for OCR & Debugger */}
        {isExecuting && (
          <div className="flex items-center gap-2 mt-2 text-xs text-amber-400 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Processing command with Gemini 3.8 Flash...</span>
          </div>
        )}
      </div>

      {/* Android Mobile Touch Softkeyboard */}
      <AndroidSoftKeyboard
        onInsertText={handleInsertText}
        onSpecialKey={handleSpecialSoftKey}
        ctrlActive={ctrlActive}
        altActive={altActive}
        onToggleCtrl={() => setCtrlActive(!ctrlActive)}
        onToggleAlt={() => setAltActive(!altActive)}
        onOpenCamera={() => setShowCamera(true)}
        onPasteClipboard={handlePasteClipboard}
        onAiPrompt={() => setShowAiModal(true)}
        onOpenCodeStudio={() => setShowCodeStudio(true)}
        onOpenDebugConsole={() => setShowDebugConsole(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
      />

      {/* Nano Editor Overlay */}
      {nanoFile && (
        <NanoEditor
          filePath={nanoFile.path}
          initialContent={nanoFile.content}
          onSave={(newContent) => {
            globalVFS.writeFile(nanoFile.path, newContent);
            setNanoFile(null);
            addLines([
              {
                id: `nano-save-${Date.now()}`,
                type: 'success',
                text: `\x1b[32m[✓] Wrote ${newContent.split('\n').length} lines to ${nanoFile.path}\x1b[0m`,
                timestamp: Date.now(),
              },
            ]);
          }}
          onClose={() => setNanoFile(null)}
        />
      )}

      {/* Top Process Monitor Overlay */}
      {showTop && <TopMonitor onClose={() => setShowTop(false)} />}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />

      {/* Fullscreen Image Preview Lightbox */}
      <ImageModal
        imageSrc={previewImage?.src || null}
        imageAlt={previewImage?.alt}
        onClose={() => setPreviewImage(null)}
        onRunOcr={() => {
          if (previewImage?.alt) {
            executeCommand(`ocr ${previewImage.alt}`, promptStyle);
          } else {
            executeCommand(`ocr /sdcard/DCIM/receipt_ocr_sample.png`, promptStyle);
          }
        }}
        onRunDebug={() => {
          if (previewImage?.alt) {
            executeCommand(`debug ${previewImage.alt}`, promptStyle);
          } else {
            executeCommand(`debug /sdcard/DCIM/Screenshots/error_stacktrace.png`, promptStyle);
          }
        }}
      />

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        cwd={activeSession.cwd}
        onInsertCommand={(cmd) => {
          setInputBuffer(cmd);
          executeCommand(cmd, promptStyle);
        }}
      />

      {/* Workstation Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        crtEffect={crtEffect}
        onToggleCrt={() => setCrtEffect(!crtEffect)}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        promptStyle={promptStyle}
        onChangePromptStyle={setPromptStyle}
        onResetVfs={() => {
          globalVFS.reset();
          clearScreen();
          addLines([
            {
              id: `reset-${Date.now()}`,
              type: 'info',
              text: '\x1b[32m[✓] Virtual Filesystem restored to initial state.\x1b[0m',
              timestamp: Date.now(),
            },
          ]);
        }}
      />

      {/* Virtual Filesystem Explorer Drawer */}
      <FileDrawer
        isOpen={showFileDrawer}
        onClose={() => setShowFileDrawer(false)}
        onSelectFile={(path, action) => {
          setShowFileDrawer(false);
          if (action === 'ocr') {
            executeCommand(`ocr ${path}`, promptStyle);
          } else if (action === 'debug') {
            executeCommand(`debug ${path}`, promptStyle);
          } else if (action === 'nano') {
            executeCommand(`nano ${path}`, promptStyle);
          } else {
            executeCommand(`cat ${path}`, promptStyle);
          }
        }}
        onUploadFile={(path, content, mimeType) => {
          globalVFS.writeFile(path, content, mimeType);
          addLines([
            {
              id: `upload-${Date.now()}`,
              type: 'success',
              text: `\x1b[32m[✓] Uploaded file to ${path}\x1b[0m`,
              timestamp: Date.now(),
            },
          ]);
        }}
      />

      {/* Code Studio (IDE) */}
      <CodeStudio
        isOpen={showCodeStudio}
        onClose={() => setShowCodeStudio(false)}
        initialFile={activeCodeStudioFile}
        onOpenInDebugger={(code, fileName) => {
          setActiveDebugTarget(fileName);
          setActiveDebugCode(code);
          setShowDebugConsole(true);
        }}
        onRunInTerminal={(cmd) => {
          setShowCodeStudio(false);
          executeCommand(cmd, promptStyle);
        }}
      />

      {/* Interactive Debugging Console (jdb/gdb) */}
      <DebugConsole
        isOpen={showDebugConsole}
        onClose={() => setShowDebugConsole(false)}
        targetFile={activeDebugTarget}
        initialCode={activeDebugCode}
        onApplyFix={handleApplyFixToFile}
      />

      {/* OCR Vision Studio */}
      <OcrStudioModal
        isOpen={showOcrStudio}
        onClose={() => setShowOcrStudio(false)}
        initialImage={previewImage?.src || null}
        onOpenInCodeStudio={(filename, code) => {
          setActiveCodeStudioFile(filename);
          setShowCodeStudio(true);
        }}
        onOpenInDebugger={(codeOrError, targetName) => {
          setActiveDebugTarget(targetName || 'extracted_code.js');
          setActiveDebugCode(codeOrError);
          setShowDebugConsole(true);
        }}
        onOpenCamera={() => setShowCamera(true)}
      />

      {/* Command History Overlay Modal */}
      <CommandHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={activeSession?.history || []}
        onExecuteCommand={(cmd) => {
          executeCommand(cmd, promptStyle);
        }}
        onInsertToInput={(cmd) => {
          setInputBuffer(cmd);
          inputRef.current?.focus();
        }}
        onClearHistory={clearHistory}
      />
    </div>
  );
}
