import React from 'react';
import { X, Palette, Volume2, VolumeX, Monitor, RotateCcw, Type } from 'lucide-react';
import { THEMES } from '../utils/themes';
import { ThemeName } from '../types/terminal';
import { isSoundEnabled, setSoundEnabled, playReturnSound } from '../utils/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeName;
  onSelectTheme: (theme: ThemeName) => void;
  crtEffect: boolean;
  onToggleCrt: () => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  promptStyle: 'termux' | 'root' | 'ubuntu';
  onChangePromptStyle: (style: 'termux' | 'root' | 'ubuntu') => void;
  onResetVfs: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  crtEffect,
  onToggleCrt,
  fontSize,
  onChangeFontSize,
  promptStyle,
  onChangePromptStyle,
  onResetVfs,
}: SettingsModalProps) {
  const [soundOn, setSoundOn] = React.useState(isSoundEnabled());

  if (!isOpen) return null;

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playReturnSound();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 text-xs font-bold text-zinc-200">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-emerald-400" />
            <span>TERMINAL WORKSTATION SETTINGS</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-4 space-y-5 text-xs text-zinc-300 max-h-[75vh] overflow-y-auto">
          {/* Themes */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2 block">
              Color Palette & Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(THEMES) as ThemeName[]).map((key) => {
                const t = THEMES[key];
                const isSelected = currentTheme === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onSelectTheme(key);
                      playReturnSound();
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition ${
                      isSelected
                        ? 'border-emerald-500 bg-zinc-900 text-white shadow-sm'
                        : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/40 flex-shrink-0"
                      style={{ backgroundColor: t.accent }}
                    />
                    <span className="truncate text-xs font-medium">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display & Effects */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2 block">
              Display & Aesthetics
            </label>
            <div className="space-y-2">
              <button
                onClick={onToggleCrt}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 transition"
              >
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-sky-400" />
                  <span>Retro CRT Scanline & Phosphor Effect</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${crtEffect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  {crtEffect ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={toggleSound}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 transition"
              >
                <div className="flex items-center gap-2">
                  {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                  <span>Mechanical Keyboard & Bell Audio</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${soundOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  {soundOn ? 'ON' : 'MUTED'}
                </span>
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2 block flex items-center justify-between">
              <span>Font Size</span>
              <span className="text-emerald-400">{fontSize}px</span>
            </label>
            <div className="flex items-center gap-2">
              {[12, 13, 14, 15, 16].map((sz) => (
                <button
                  key={sz}
                  onClick={() => onChangeFontSize(sz)}
                  className={`flex-1 py-1.5 rounded border text-xs font-mono font-bold transition ${
                    fontSize === sz
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Style */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-2 block">
              Prompt Identity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'termux', label: 'Android Termux' },
                { id: 'root', label: 'Android Root (#)' },
                { id: 'ubuntu', label: 'Ubuntu Desktop' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => onChangePromptStyle(style.id as any)}
                  className={`py-2 px-2 rounded-lg border text-center text-xs font-medium transition ${
                    promptStyle === style.id
                      ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Filesystem */}
          <div className="pt-2 border-t border-zinc-800">
            <button
              onClick={() => {
                if (confirm('Reset virtual filesystem to defaults? All custom files will be restored to initial state.')) {
                  onResetVfs();
                  playReturnSound();
                }
              }}
              className="w-full py-2 bg-red-950/40 hover:bg-red-950/80 border border-red-800/60 text-red-300 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filesystem to Factory Default</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
