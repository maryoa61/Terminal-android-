import React, { useState } from 'react';
import { X, Folder, File, FileText, Image as ImageIcon, Upload, RefreshCw, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { globalVFS, VFSNode } from '../utils/vfs';
import { playReturnSound, playSuccessSound } from '../utils/sound';

interface FileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string, action?: 'cat' | 'ocr' | 'debug' | 'nano') => void;
  onUploadFile: (filename: string, content: string, mimeType?: string) => void;
}

export function FileDrawer({ isOpen, onClose, onSelectFile, onUploadFile }: FileDrawerProps) {
  const [currentPath, setCurrentPath] = useState('/home/user');
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isOpen) return null;

  const items = globalVFS.listDirectory(currentPath);

  const handleNavigate = (dirName: string) => {
    playReturnSound();
    if (dirName === '..') {
      const lastSlash = currentPath.lastIndexOf('/');
      const parent = lastSlash <= 0 ? '/' : currentPath.slice(0, lastSlash);
      setCurrentPath(parent);
    } else {
      const next = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`;
      setCurrentPath(next);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');

    reader.onload = () => {
      const result = reader.result as string;
      const targetPath = `${currentPath === '/' ? '' : currentPath}/${file.name}`;
      onUploadFile(targetPath, result, file.type);
      setRefreshKey((k) => k + 1);
      playSuccessSound();
    };

    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-80 bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-zinc-200 font-bold">
          <Folder className="w-4 h-4 text-emerald-400" />
          <span>VIRTUAL STORAGE EXPLORER</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Path Bar & Actions */}
      <div className="p-2.5 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 truncate text-[11px] text-zinc-300">
          <span className="text-zinc-500 font-semibold">PATH:</span>
          <span className="truncate text-emerald-400">{currentPath}</span>
        </div>

        <div className="flex items-center gap-1">
          <label className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer transition" title="Upload to current folder">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="flex items-center gap-1 p-2 bg-zinc-950 border-b border-zinc-800/80 overflow-x-auto no-scrollbar text-[11px]">
        {[
          { label: 'Home', path: '/home/user' },
          { label: 'SDCard', path: '/sdcard' },
          { label: 'DCIM', path: '/sdcard/DCIM' },
          { label: 'Screenshots', path: '/sdcard/DCIM/Screenshots' },
          { label: 'Root (/)', path: '/' },
        ].map((sc) => (
          <button
            key={sc.path}
            onClick={() => {
              setCurrentPath(sc.path);
              playReturnSound();
            }}
            className={`px-2 py-0.5 rounded transition whitespace-nowrap ${
              currentPath === sc.path
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
            }`}
          >
            {sc.label}
          </button>
        ))}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {currentPath !== '/' && (
          <button
            onClick={() => handleNavigate('..')}
            className="w-full flex items-center gap-2 p-2 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded text-left transition"
          >
            <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-bold">.. [Parent Directory]</span>
          </button>
        )}

        {items.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-xs">
            Directory is empty
          </div>
        ) : (
          items.map((node) => {
            const isImage = node.mimeType?.startsWith('image/') || node.name.match(/\.(png|jpg|jpeg|webp)$/i);
            const isScript = node.name.match(/\.(js|py|sh|ts)$/i);

            if (node.isDir) {
              return (
                <button
                  key={node.path}
                  onClick={() => handleNavigate(node.name)}
                  className="w-full flex items-center justify-between p-2 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded text-left transition group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span className="truncate font-medium">{node.name}/</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                </button>
              );
            }

            return (
              <div
                key={node.path}
                className="w-full flex items-center justify-between p-2 hover:bg-zinc-900/80 rounded group transition"
              >
                <div
                  onClick={() => onSelectFile(node.path, isImage ? 'cat' : 'cat')}
                  className="flex items-center gap-2 truncate flex-1 cursor-pointer"
                >
                  {isImage ? (
                    <ImageIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  ) : isScript ? (
                    <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <File className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  )}
                  <span className={`truncate ${isImage ? 'text-purple-300' : isScript ? 'text-emerald-300' : 'text-zinc-300'}`}>
                    {node.name}
                  </span>
                </div>

                {/* Quick actions for file */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0 ml-1">
                  {isImage && (
                    <>
                      <button
                        onClick={() => onSelectFile(node.path, 'ocr')}
                        className="px-1.5 py-0.5 bg-sky-950 hover:bg-sky-900 text-sky-300 text-[10px] rounded border border-sky-800"
                        title="OCR this image"
                      >
                        OCR
                      </button>
                      <button
                        onClick={() => onSelectFile(node.path, 'debug')}
                        className="px-1.5 py-0.5 bg-amber-950 hover:bg-amber-900 text-amber-300 text-[10px] rounded border border-amber-800"
                        title="Debug this image"
                      >
                        Debug
                      </button>
                    </>
                  )}
                  {isScript && (
                    <button
                      onClick={() => onSelectFile(node.path, 'debug')}
                      className="px-1.5 py-0.5 bg-amber-950 hover:bg-amber-900 text-amber-300 text-[10px] rounded border border-amber-800"
                      title="Debug this script"
                    >
                      Debug
                    </button>
                  )}
                  {!isImage && (
                    <button
                      onClick={() => onSelectFile(node.path, 'nano')}
                      className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded"
                      title="Edit in nano"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-zinc-950 border-t border-zinc-800/80 text-[10px] text-zinc-500 flex justify-between items-center">
        <span>Files persist in browser storage</span>
        <span>{items.length} items</span>
      </div>
    </div>
  );
}
