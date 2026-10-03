import React, { useState, useEffect, useRef } from 'react';
import { Save, LogOut, Check, AlertCircle } from 'lucide-react';
import { playReturnSound, playSuccessSound } from '../utils/sound';

interface NanoEditorProps {
  filePath: string;
  initialContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export function NanoEditor({ filePath, initialContent, onSave, onClose }: NanoEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isModified, setIsModified] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsModified(true);
    setStatusMessage('');
  };

  const handleSave = () => {
    onSave(content);
    setIsModified(false);
    playSuccessSound();
    setStatusMessage(`[ Wrote ${content.split('\n').length} lines to ${filePath} ]`);
    setTimeout(() => {
      setStatusMessage('');
    }, 2500);
  };

  const handleExit = () => {
    if (isModified) {
      if (confirm('Save modified buffer before exiting?')) {
        handleSave();
      }
    }
    playReturnSound();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+O to save
    if (e.ctrlKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      handleSave();
    }
    // Ctrl+X to exit
    else if (e.ctrlKey && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      handleExit();
    }
    // Tab key inserts 2 spaces
    else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      setIsModified(true);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const lines = content.split('\n');

  return (
    <div className="absolute inset-0 z-30 bg-black text-gray-200 font-mono flex flex-col select-text">
      {/* Nano Header Bar */}
      <div className="bg-zinc-800 text-zinc-100 px-3 py-1 text-xs flex items-center justify-between font-bold border-b border-zinc-700">
        <span className="bg-white text-black px-1.5 py-0.2 rounded font-black text-[11px]">
          GNU nano 7.2
        </span>
        <span className="truncate max-w-[280px] sm:max-w-none">
          File: <span className="text-emerald-400">{filePath}</span>
          {isModified && <span className="text-amber-400 ml-1.5">*Modified*</span>}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-black px-2 py-0.5 rounded text-[11px] font-bold transition"
            title="Ctrl+O"
          >
            <Save className="w-3 h-3" />
            <span>Save (^O)</span>
          </button>
          <button
            onClick={handleExit}
            className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-2 py-0.5 rounded text-[11px] transition"
            title="Ctrl+X"
          >
            <LogOut className="w-3 h-3" />
            <span>Exit (^X)</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 flex overflow-hidden bg-black/95">
        {/* Line numbers column */}
        <div className="w-10 sm:w-12 bg-zinc-950 text-zinc-600 text-right pr-2 py-2 select-none text-xs border-r border-zinc-800/80 font-mono overflow-hidden">
          {lines.map((_, i) => (
            <div key={i} className="leading-5 h-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="flex-1 bg-transparent text-zinc-100 p-2 text-xs sm:text-sm leading-5 font-mono resize-none focus:outline-none overflow-auto border-none"
          placeholder="Start typing..."
        />
      </div>

      {/* Status Bar */}
      {statusMessage && (
        <div className="bg-emerald-950 text-emerald-300 px-3 py-1 text-xs border-t border-emerald-800 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Nano Bottom Shortcuts */}
      <div className="bg-zinc-900 border-t border-zinc-800 text-[10px] sm:text-[11px] p-1.5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1 select-none">
        <button
          onClick={handleSave}
          className="flex items-center gap-1 hover:bg-zinc-800 p-1 rounded transition text-zinc-300"
        >
          <span className="font-bold text-emerald-400">^O</span> WriteOut (Save)
        </button>
        <button
          onClick={handleExit}
          className="flex items-center gap-1 hover:bg-zinc-800 p-1 rounded transition text-zinc-300"
        >
          <span className="font-bold text-amber-400">^X</span> Exit
        </button>
        <div className="flex items-center gap-1 p-1 text-zinc-500 hidden sm:flex">
          <span className="font-bold text-zinc-400">^R</span> Read File
        </div>
        <div className="flex items-center gap-1 p-1 text-zinc-500 hidden sm:flex">
          <span className="font-bold text-zinc-400">^W</span> Where Is
        </div>
        <div className="flex items-center gap-1 p-1 text-zinc-500 hidden sm:flex">
          <span className="font-bold text-zinc-400">^K</span> Cut
        </div>
        <div className="flex items-center gap-1 p-1 text-zinc-500 hidden sm:flex">
          <span className="font-bold text-zinc-400">^U</span> Paste
        </div>
      </div>
    </div>
  );
}
