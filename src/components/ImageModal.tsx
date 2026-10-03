import React from 'react';
import { X, ZoomIn, ZoomOut, Download, Sparkles, Bug } from 'lucide-react';

interface ImageModalProps {
  imageSrc: string | null;
  imageAlt?: string;
  onClose: () => void;
  onRunOcr?: (imgSrc: string) => void;
  onRunDebug?: (imgSrc: string) => void;
}

export function ImageModal({ imageSrc, imageAlt, onClose, onRunOcr, onRunDebug }: ImageModalProps) {
  const [zoom, setZoom] = React.useState(1);

  if (!imageSrc) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = imageAlt || 'androterm-image.png';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-300">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-emerald-400">IMGVIEW //</span>
            <span className="truncate">{imageAlt || 'image_preview.png'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 overflow-auto bg-black flex items-center justify-center p-4 min-h-[350px]">
          <img
            src={imageSrc}
            alt={imageAlt || 'Preview'}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className="max-h-[68vh] max-w-full object-contain transition-transform duration-100 shadow-lg"
          />
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] text-zinc-500">
            Use OCR to extract text/tables or Debugger to diagnose screenshots.
          </span>
          <div className="flex items-center gap-2">
            {onRunOcr && (
              <button
                onClick={() => {
                  onRunOcr(imageSrc);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded-lg transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Read Text (OCR)
              </button>
            )}
            {onRunDebug && (
              <button
                onClick={() => {
                  onRunDebug(imageSrc);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition"
              >
                <Bug className="w-3.5 h-3.5" />
                Debug with AI
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
