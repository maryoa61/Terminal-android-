import React, { useState } from 'react';
import { TerminalLine, TerminalTheme } from '../types/terminal';
import { parseAnsiToReact } from '../utils/ansi';
import { Copy, Check, FileDown, Sparkles, Bug, Image as ImageIcon, ChevronRight, Wrench } from 'lucide-react';
import { playSuccessSound } from '../utils/sound';

interface TerminalOutputProps {
  lines: TerminalLine[];
  theme: TerminalTheme;
  onOpenImage: (src: string, alt?: string) => void;
  onApplyFix?: (targetFile: string, newCode: string) => void;
  onRunOcr?: (imgSrc: string) => void;
  onRunDebug?: (imgSrc: string) => void;
  onOpenInCodeStudio?: (filename: string, code: string) => void;
  onOpenInDebugger?: (code: string, fileName: string) => void;
}

export function TerminalOutput({
  lines,
  theme,
  onOpenImage,
  onApplyFix,
  onRunOcr,
  onRunDebug,
  onOpenInCodeStudio,
  onOpenInDebugger,
}: TerminalOutputProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedFixId, setAppliedFixId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playSuccessSound();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyFix = (line: TerminalLine) => {
    if (line.debugOriginalTarget && line.debugFixedCode && onApplyFix) {
      onApplyFix(line.debugOriginalTarget, line.debugFixedCode);
      setAppliedFixId(line.id);
      playSuccessSound();
    }
  };

  return (
    <div className="space-y-1.5 font-mono text-xs sm:text-sm select-text">
      {lines.map((line) => {
        if (line.type === 'input') {
          return (
            <div key={line.id} className="flex items-start gap-1.5 pt-1 text-zinc-100 flex-wrap">
              {line.commandPrompt ? (
                <span className="font-semibold">{parseAnsiToReact(line.commandPrompt)}</span>
              ) : (
                <span className="text-emerald-400 font-semibold">$</span>
              )}
              <span className="font-bold break-all">{line.text}</span>
            </div>
          );
        }

        if (line.type === 'image') {
          return (
            <div key={line.id} className="my-2 p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg max-w-xl">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{line.imageAlt || 'image_view.png'}</span>
                </div>
                <span className="text-zinc-500">Click to expand</span>
              </div>

              {line.imageSrc && (
                <div
                  onClick={() => onOpenImage(line.imageSrc!, line.imageAlt)}
                  className="relative group cursor-pointer overflow-hidden rounded border border-zinc-800 bg-black/60 max-h-64 flex items-center justify-center"
                >
                  <img
                    src={line.imageSrc}
                    alt={line.imageAlt || 'Terminal Preview'}
                    className="max-h-64 object-contain transition-transform group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-black/80 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/30">
                      🔍 Click for Fullscreen / Actions
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons under image */}
              <div className="flex items-center gap-2 mt-2.5">
                {onRunOcr && line.imageSrc && (
                  <button
                    onClick={() => onRunOcr(line.imageSrc!)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-medium transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Run OCR (Extract Text)</span>
                  </button>
                )}
                {onRunDebug && line.imageSrc && (
                  <button
                    onClick={() => onRunDebug(line.imageSrc!)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 rounded text-[11px] font-medium transition"
                  >
                    <Bug className="w-3 h-3" />
                    <span>Debug Image with AI</span>
                  </button>
                )}
              </div>
            </div>
          );
        }

        if (line.type === 'ocr-result') {
          return (
            <div key={line.id} className="my-2 p-3 bg-zinc-950/90 border border-sky-500/30 rounded-lg">
              <div className="flex items-center justify-between text-xs text-sky-400 font-bold pb-2 mb-2 border-b border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>OCR TEXT EXTRACTION // GEMINI 3.8 FLASH</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-normal">
                    {line.ocrLineCount || 0} lines detected
                  </span>
                  {line.ocrText && (
                    <button
                      onClick={() => handleCopy(line.ocrText!, line.id)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] transition"
                    >
                      {copiedId === line.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === line.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-black/70 p-3 rounded border border-zinc-800/80 font-mono text-zinc-200 text-xs whitespace-pre-wrap select-text leading-relaxed overflow-x-auto">
                {line.ocrText || line.text}
              </div>

              {/* Action buttons to immediately code or debug extracted text */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800/60">
                {onOpenInCodeStudio && line.ocrText && (
                  <button
                    onClick={() => {
                      const fname = `projects/ocr_snippet_${line.id.slice(0, 6)}.js`;
                      onOpenInCodeStudio(fname, line.ocrText!);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black text-[11px] font-bold rounded transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Open in Code Studio</span>
                  </button>
                )}
                {onOpenInDebugger && line.ocrText && (
                  <button
                    onClick={() => onOpenInDebugger(line.ocrText!, 'ocr_snippet.js')}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold rounded transition"
                  >
                    <Bug className="w-3 h-3" />
                    <span>Launch in Debugger</span>
                  </button>
                )}
              </div>
            </div>
          );
        }

        if (line.type === 'debug-report') {
          return (
            <div key={line.id} className="my-2 p-3.5 bg-zinc-950/95 border border-amber-500/40 rounded-lg shadow-lg">
              <div className="flex items-center justify-between text-xs text-amber-400 font-bold pb-2.5 mb-2.5 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-amber-400" />
                  <span>AI TERMINAL DIAGNOSTIC REPORT</span>
                  {line.debugOriginalTarget && (
                    <span className="text-[11px] text-zinc-400 font-normal">
                      target: <code className="text-emerald-400 font-mono">{line.debugOriginalTarget}</code>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {line.debugReport && (
                    <button
                      onClick={() => handleCopy(line.debugReport!, line.id)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] transition"
                    >
                      {copiedId === line.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Report</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Diagnosis Body */}
              <div className="space-y-2 text-xs text-zinc-200 leading-relaxed font-mono">
                {line.debugReport ? (
                  <div className="whitespace-pre-wrap break-words">{line.debugReport}</div>
                ) : (
                  line.text && parseAnsiToReact(line.text)
                )}
              </div>

              {/* Action: Apply Fix directly to file if fixed code is available */}
              {line.debugOriginalTarget && line.debugFixedCode && onApplyFix && (
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-400">
                    Auto-fix generated for <span className="text-zinc-200 font-bold">{line.debugOriginalTarget}</span>
                  </span>
                  <button
                    onClick={() => handleApplyFix(line)}
                    disabled={appliedFixId === line.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      appliedFixId === line.id
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-md shadow-emerald-600/20 active:scale-95'
                    }`}
                  >
                    {appliedFixId === line.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Fix Applied to File!</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Apply Fix to File</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        }

        // Standard line
        return (
          <div key={line.id} className="leading-relaxed">
            {line.text ? parseAnsiToReact(line.text) : null}
          </div>
        );
      })}
    </div>
  );
}
