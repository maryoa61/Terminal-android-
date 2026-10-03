import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Camera,
  FileCode,
  Table,
  FileText,
  Bug,
  Copy,
  Check,
  Download,
  Loader2,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Code2,
} from 'lucide-react';
import { OcrMode } from '../types/terminal';
import { playSuccessSound, playReturnSound } from '../utils/sound';
import { globalVFS } from '../utils/vfs';

interface OcrStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string | null;
  onOpenInCodeStudio: (filename: string, code: string) => void;
  onOpenInDebugger: (codeOrError: string, targetName?: string) => void;
  onOpenCamera: () => void;
}

export function OcrStudioModal({
  isOpen,
  onClose,
  initialImage,
  onOpenInCodeStudio,
  onOpenInDebugger,
  onOpenCamera,
}: OcrStudioModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(initialImage || null);
  const [imageName, setImageName] = useState<string>('sample_receipt.png');
  const [ocrMode, setOcrMode] = useState<OcrMode>('text');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [detectedLang, setDetectedLang] = useState<string>('text');
  const [lineCount, setLineCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (initialImage) {
      setSelectedImage(initialImage);
    } else if (!selectedImage) {
      // Default to sample receipt in VFS
      const sample = globalVFS.readFile('/sdcard/DCIM/receipt_ocr_sample.png');
      if (sample) {
        setSelectedImage(sample.content);
        setImageName('receipt_ocr_sample.png');
      }
    }
  }, [initialImage, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedImage(dataUrl);
      setExtractedText('');
      // Save to VFS DCIM
      globalVFS.writeFile(`/sdcard/DCIM/${file.name}`, dataUrl, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (path: string, name: string, defaultMode: OcrMode = 'text') => {
    const file = globalVFS.readFile(path);
    if (file) {
      setSelectedImage(file.content);
      setImageName(name);
      setOcrMode(defaultMode);
      setExtractedText('');
      playReturnSound();
    }
  };

  const runOcr = async () => {
    if (!selectedImage || isLoading) return;

    setIsLoading(true);
    setCopied(false);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/terminal/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage,
          prompt: customPrompt,
          mode: ocrMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setExtractedText(data.text);
        setLineCount(data.lineCount || data.text.split('\n').length);
        setDetectedLang(data.detectedLang || 'text');
        playSuccessSound();
      } else {
        setExtractedText(`[OCR Error]: ${data.error || 'Failed to process image'}`);
      }
    } catch (err: any) {
      setExtractedText(`[OCR Connection Error]: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    playSuccessSound();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToVfs = () => {
    if (!extractedText) return;
    let ext = '.txt';
    if (detectedLang === 'javascript') ext = '.js';
    else if (detectedLang === 'python') ext = '.py';
    else if (detectedLang === 'kotlin') ext = '.kt';

    const baseName = imageName.replace(/\.[^/.]+$/, '');
    const outPath = `/sdcard/Download/${baseName}_ocr${ext}`;
    globalVFS.writeFile(outPath, extractedText);
    setSavedSuccess(true);
    playSuccessSound();
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCodeStudio = () => {
    if (!extractedText) return;
    let ext = 'js';
    if (detectedLang === 'python') ext = 'py';
    else if (detectedLang === 'kotlin') ext = 'kt';
    else if (detectedLang === 'bash') ext = 'sh';

    const baseName = imageName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
    const fileName = `projects/${baseName}_ocr.${ext}`;
    globalVFS.writeFile(`/home/user/${fileName}`, extractedText);
    onOpenInCodeStudio(fileName, extractedText);
    onClose();
  };

  const handleDebugger = () => {
    if (!extractedText) return;
    onOpenInDebugger(extractedText, imageName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 font-mono animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-zinc-950 border border-sky-500/40 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="font-bold text-sky-400">ANDRO-OCR VISION STUDIO // GEMINI 3.8 FLASH</span>
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

        {/* Top Control Bar: Mode selection & image picking */}
        <div className="p-3 bg-zinc-900/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
          {/* OCR Mode buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mr-1">
              Extraction Mode:
            </span>
            {[
              { id: 'text', label: 'All Text', icon: FileText },
              { id: 'code', label: 'Code Only', icon: FileCode },
              { id: 'table', label: 'Table / Data', icon: Table },
              { id: 'log', label: 'Logcat / Errors', icon: Bug },
            ].map((m) => {
              const Icon = m.icon;
              const isActive = ocrMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setOcrMode(m.id as OcrMode)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-500 text-black font-bold shadow-sm'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Image source buttons */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-xs font-semibold cursor-pointer transition border border-zinc-700">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Upload Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                onOpenCamera();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-400 rounded-md text-xs font-semibold transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Camera</span>
            </button>
          </div>
        </div>

        {/* Preloaded Sample Quick Chips */}
        <div className="px-4 py-1.5 bg-zinc-950 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar text-[11px]">
          <span className="text-zinc-500 text-[10px] uppercase font-bold flex-shrink-0">
            Quick Samples:
          </span>
          <button
            onClick={() =>
              handleSelectSample(
                '/sdcard/DCIM/Screenshots/error_stacktrace.png',
                'error_stacktrace.png',
                'log'
              )
            }
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 whitespace-nowrap transition"
          >
            🐛 Crash Stacktrace (Code & NPE)
          </button>
          <button
            onClick={() =>
              handleSelectSample(
                '/sdcard/DCIM/receipt_ocr_sample.png',
                'receipt_ocr_sample.png',
                'table'
              )
            }
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-sky-300 border border-sky-500/30 whitespace-nowrap transition"
          >
            📄 Hardware Lab Invoice (Tables)
          </button>
        </div>

        {/* Main Side-by-Side Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800 overflow-hidden min-h-[350px]">
          {/* Left Column: Image Preview */}
          <div className="flex flex-col bg-black/60 p-3 overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="font-semibold text-zinc-300 truncate">
                Source: <span className="text-sky-400">{imageName}</span>
              </span>
              <span className="text-[11px] text-zinc-500">Optical Target</span>
            </div>

            <div className="flex-1 relative rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden flex items-center justify-center p-2">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={imageName}
                  className="max-h-[50vh] max-w-full object-contain rounded shadow-lg"
                />
              ) : (
                <div className="text-center p-6 text-zinc-600 text-xs">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                  <span>No image selected. Upload an image or select a sample above.</span>
                </div>
              )}
            </div>

            {/* Run OCR Action Button */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={runOcr}
                disabled={!selectedImage || isLoading}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Text with Gemini 3.8...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Text ({ocrMode.toUpperCase()})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Extracted Text & Code Editor Bridge */}
          <div className="flex flex-col bg-zinc-950 p-3 overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sky-400">EXTRACTED CONTENT</span>
                {lineCount > 0 && (
                  <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-300">
                    {lineCount} lines {detectedLang !== 'text' ? `• ${detectedLang}` : ''}
                  </span>
                )}
              </div>

              {extractedText && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleSaveToVfs}
                    className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] transition"
                    title="Save to /sdcard/Download"
                  >
                    {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{savedSuccess ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Extracted text container */}
            <div className="flex-1 bg-black/80 rounded-lg border border-zinc-800 p-3 overflow-y-auto font-mono text-xs text-zinc-200 select-text leading-relaxed whitespace-pre-wrap">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-sky-400 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                  <span className="text-xs">Analyzing image structure and text tokens...</span>
                </div>
              ) : extractedText ? (
                extractedText
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs">
                  <FileText className="w-8 h-8 mb-2 opacity-40" />
                  <span>Click &quot;Extract Text&quot; to run Gemini OCR.</span>
                </div>
              )}
            </div>

            {/* Direct Workflow Integrations */}
            {extractedText && (
              <div className="mt-3 pt-2.5 border-t border-zinc-800 grid grid-cols-2 gap-2">
                <button
                  onClick={handleCodeStudio}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-lg transition active:scale-98 shadow-md"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Open in Code Studio</span>
                </button>

                <button
                  onClick={handleDebugger}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition active:scale-98 shadow-md"
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>Launch in Debugger</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>OCR preserves exact indentation, hex values, and code syntax.</span>
          <span>AndroTerm Pro Vision Engine</span>
        </div>
      </div>
    </div>
  );
}
