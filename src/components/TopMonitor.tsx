import React, { useState, useEffect } from 'react';
import { ProcessItem } from '../types/terminal';
import { X, Play, Square } from 'lucide-react';

interface TopMonitorProps {
  onClose: () => void;
}

const INITIAL_PROCESSES: ProcessItem[] = [
  { pid: 1, user: 'root', pr: 20, ni: 0, virt: '12.4M', res: '4.8M', shr: '2.1M', s: 'S', cpu: 0.1, mem: 0.1, time: '0:08.12', command: 'init [android]' },
  { pid: 312, user: 'system', pr: -2, ni: 0, virt: '1.2G', res: '280M', shr: '84M', s: 'S', cpu: 4.8, mem: 5.6, time: '2:14.90', command: 'system_server' },
  { pid: 489, user: 'system', pr: -16, ni: 0, virt: '480M', res: '92M', shr: '38M', s: 'S', cpu: 6.2, mem: 2.1, time: '1:44.22', command: 'surfaceflinger' },
  { pid: 1042, user: 'u0_a12', pr: 20, ni: 0, virt: '840M', res: '160M', shr: '72M', s: 'S', cpu: 1.4, mem: 3.2, time: '0:42.50', command: 'com.android.systemui' },
  { pid: 2190, user: 'u0_a245', pr: 20, ni: 0, virt: '45M', res: '18M', shr: '12M', s: 'R', cpu: 2.1, mem: 0.6, time: '0:12.30', command: 'androterm-daemon' },
  { pid: 2204, user: 'u0_a245', pr: 20, ni: 0, virt: '16M', res: '6.2M', shr: '4.1M', s: 'S', cpu: 0.0, mem: 0.2, time: '0:01.18', command: '/bin/bash' },
  { pid: 2315, user: 'u0_a245', pr: 20, ni: 0, virt: '24M', res: '9.4M', shr: '5.2M', s: 'R', cpu: 1.8, mem: 0.3, time: '0:00.45', command: 'top -d 1.5' },
  { pid: 1801, user: 'shell', pr: 20, ni: 0, virt: '32M', res: '11M', shr: '6.0M', s: 'S', cpu: 0.3, mem: 0.2, time: '0:05.10', command: 'adbd --root' },
];

export function TopMonitor({ onClose }: TopMonitorProps) {
  const [processes, setProcesses] = useState<ProcessItem[]>(INITIAL_PROCESSES);
  const [uptimeSeconds, setUptimeSeconds] = useState(14820);
  const [cpuLoad, setCpuLoad] = useState({ user: 8.4, sys: 4.2, idle: 87.4 });
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setUptimeSeconds((prev) => prev + 2);
      
      // Randomize CPU load slightly
      const user = Math.max(2, Math.min(65, +(Math.random() * 12 + 6).toFixed(1)));
      const sys = Math.max(1, Math.min(25, +(Math.random() * 5 + 3).toFixed(1)));
      const idle = +(100 - user - sys).toFixed(1);
      setCpuLoad({ user, sys, idle });

      // Jitter process CPU values
      setProcesses((prev) =>
        prev.map((p) => {
          if (p.command.includes('system_server') || p.command.includes('surfaceflinger')) {
            const delta = (Math.random() - 0.5) * 2;
            return { ...p, cpu: Math.max(0.1, +(p.cpu + delta).toFixed(1)) };
          }
          return p;
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/95 text-emerald-400 font-mono p-3 flex flex-col text-xs select-text overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-300">
        <div>
          <span className="font-bold text-white">top -</span>{' '}
          <span className="text-zinc-400">up {formatUptime(uptimeSeconds)}, 1 user, load average: 0.42, 0.38, 0.31</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Square className="w-3 h-3 text-amber-400" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 hover:bg-red-900 text-red-200 text-[11px] border border-red-800"
          >
            <X className="w-3 h-3" />
            <span>Quit (q)</span>
          </button>
        </div>
      </div>

      {/* Task & CPU Summary */}
      <div className="py-2 text-[11px] space-y-1 text-zinc-400 border-b border-zinc-800/80">
        <div>
          <span className="text-white font-semibold">Tasks:</span> 148 total,{' '}
          <span className="text-emerald-400">2 running</span>, 146 sleeping, 0 stopped, 0 zombie
        </div>
        <div>
          <span className="text-white font-semibold">%Cpu(s):</span>{' '}
          <span className="text-amber-400">{cpuLoad.user}% us</span>,{' '}
          <span className="text-sky-400">{cpuLoad.sys}% sy</span>, 0.0% ni,{' '}
          <span className="text-zinc-500">{cpuLoad.idle}% id</span>, 0.1% wa, 0.0% hi, 0.3% si
        </div>
        <div>
          <span className="text-white font-semibold">MiB Mem :</span> 7840.2 total, 3120.4 free,{' '}
          <span className="text-emerald-400">3214.8 used</span>, 1505.0 buff/cache
        </div>
      </div>

      {/* Process Table Header */}
      <div className="bg-zinc-800 text-zinc-200 font-bold px-2 py-1 text-[11px] grid grid-cols-12 gap-1 mt-2 rounded">
        <span className="col-span-1">PID</span>
        <span className="col-span-2">USER</span>
        <span className="col-span-1">PR</span>
        <span className="col-span-1">VIRT</span>
        <span className="col-span-1">RES</span>
        <span className="col-span-1">S</span>
        <span className="col-span-1">%CPU</span>
        <span className="col-span-1">%MEM</span>
        <span className="col-span-1">TIME+</span>
        <span className="col-span-2">COMMAND</span>
      </div>

      {/* Process Table Rows */}
      <div className="flex-1 overflow-y-auto space-y-0.5 mt-1 font-mono text-[11px]">
        {processes.map((p) => (
          <div
            key={p.pid}
            className={`grid grid-cols-12 gap-1 px-2 py-0.5 rounded transition ${
              p.s === 'R' ? 'text-emerald-300 bg-emerald-950/20' : 'text-zinc-300 hover:bg-zinc-900/60'
            }`}
          >
            <span className="col-span-1 font-semibold text-zinc-400">{p.pid}</span>
            <span className="col-span-2 text-sky-400 truncate">{p.user}</span>
            <span className="col-span-1 text-zinc-500">{p.pr}</span>
            <span className="col-span-1 text-zinc-400">{p.virt}</span>
            <span className="col-span-1 text-zinc-400">{p.res}</span>
            <span className="col-span-1">
              <span className={`font-bold ${p.s === 'R' ? 'text-emerald-400' : 'text-zinc-500'}`}>{p.s}</span>
            </span>
            <span className="col-span-1 font-bold text-amber-400">{p.cpu.toFixed(1)}</span>
            <span className="col-span-1 text-zinc-400">{p.mem.toFixed(1)}</span>
            <span className="col-span-1 text-zinc-500">{p.time}</span>
            <span className="col-span-2 text-white font-medium truncate">{p.command}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-2 text-[10px] text-zinc-500 flex justify-between border-t border-zinc-800">
        <span>Press [q] or [Ctrl+C] to exit process monitor</span>
        <span>Android Linux 6.1 aarch64</span>
      </div>
    </div>
  );
}
