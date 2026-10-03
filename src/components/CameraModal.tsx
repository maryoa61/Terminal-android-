import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';
import { playCameraShutterSound } from '../utils/sound';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, autoAction?: 'ocr' | 'debug') => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: 'environment' | 'user') => {
    stopCamera();
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      // Fallback without facingMode constraint if device doesn't support environment
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr: any) {
        setError('Camera permission denied or camera not found on this device. You can also upload screenshots or images directly from the terminal.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    playCameraShutterSound();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
    }
    setIsProcessing(false);
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = (action?: 'ocr' | 'debug') => {
    if (capturedImage) {
      onCapture(capturedImage, action);
      onClose();
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-emerald-500/40 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-400">DEV_CAMERA_SCANNER // /dev/video0</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative flex-1 bg-black min-h-[340px] flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center max-w-sm">
              <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-300 mb-4">{error}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs"
              >
                Retry Camera Access
              </button>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-zinc-900">
              <img
                src={capturedImage}
                alt="Captured document or screen"
                className="max-h-[60vh] max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/70 px-2 py-1 rounded text-xs text-emerald-400 border border-emerald-500/30">
                ✓ SNAPSHOT CAPTURED
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Tactical scanner HUD overlay */}
              <div className="absolute inset-8 border border-emerald-500/30 rounded pointer-events-none flex flex-col justify-between p-2">
                <div className="flex justify-between text-[10px] text-emerald-500/70">
                  <span>[OCR TARGET LOCK]</span>
                  <span>1080p :: AUTO-FOCUS</span>
                </div>
                {/* Crosshairs */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-emerald-400/50 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                </div>
                <div className="flex justify-between text-[10px] text-emerald-500/70">
                  <span>FACING: {facingMode.toUpperCase()}</span>
                  <span>READY TO CAPTURE</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Action Controls */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800">
          {capturedImage ? (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400 text-center">
                Image ready in buffer. Select terminal operation:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleConfirm('ocr')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-black font-semibold text-xs rounded-lg transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Read Text (OCR)
                </button>
                <button
                  onClick={() => handleConfirm('debug')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg transition"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Debug Error
                </button>
                <button
                  onClick={() => handleConfirm()}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-lg transition"
                >
                  Save to /sdcard
                </button>
              </div>
              <button
                onClick={handleRetake}
                className="w-full py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                Retake photo
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={toggleFacingMode}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl transition flex items-center gap-2 text-xs"
                title="Switch camera"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Flip</span>
              </button>

              <button
                onClick={handleCapture}
                disabled={!!error || isProcessing}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span>Snap Code / Document</span>
              </button>

              <button
                onClick={onClose}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl transition text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
