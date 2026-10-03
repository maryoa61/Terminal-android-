import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  StepForward,
  CornerDownRight,
  Square,
  Bug,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  Send,
  HelpCircle,
} from 'lucide-react';
import { Breakpoint, StackFrame, ScopeVariable, DebugThread } from '../types/terminal';
import { globalVFS } from '../utils/vfs';
import { playReturnSound, playSuccessSound, playBellSound, playKeySound } from '../utils/sound';

interface DebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  targetFile?: string;
  initialCode?: string;
  onApplyFix?: (targetFile: string, newCode: string) => void;
}

export function DebugConsole({
  isOpen,
  onClose,
  targetFile = 'projects/buggy_app.js',
  initialCode,
  onApplyFix,
}: DebugConsoleProps) {
  // Source code state
  const [sourceCode, setSourceCode] = useState<string>('');
  const [activeFileName, setActiveFileName] = useState<string>(targetFile);
  const [lines, setLines] = useState<string[]>([]);

  // Debugger Execution State
  const [currentLine, setCurrentLine] = useState<number>(1);
  const [status, setStatus] = useState<'IDLE' | 'STOPPED' | 'RUNNING' | 'CRASHED' | 'TERMINATED'>('STOPPED');
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([
    { id: 1, line: 3, file: targetFile, enabled: true, hitCount: 0 },
  ]);
  const [variables, setVariables] = useState<Record<string, ScopeVariable>>({
    user: { name: 'user', value: 'null', type: 'Object (nullable)', scope: 'local' },
    cartTotal: { name: 'cartTotal', value: '100', type: 'number', scope: 'local' },
    tier: { name: 'tier', value: '<undefined>', type: 'string', scope: 'local' },
  });
  const [callStack, setCallStack] = useState<StackFrame[]>([
    { id: 0, functionName: 'calculateUserDiscount(user, cartTotal)', fileName: targetFile, line: 3, address: '0x7fff89a0' },
    { id: 1, functionName: 'main()', fileName: targetFile, line: 11, address: '0x7fff89c8' },
    { id: 2, functionName: '__libc_start_main()', fileName: 'libc.so', line: 42, address: '0xb4000020' },
  ]);
  const [threads, setThreads] = useState<DebugThread[]>([
    { id: 1, name: 'main [PID 3124]', state: 'SUSPENDED', currentPc: '0x7fff89a0' },
    { id: 2, name: 'RenderThread [PID 3125]', state: 'RUNNING', currentPc: '0xb4112000' },
    { id: 3, name: 'HeapTaskDaemon [PID 3126]', state: 'WAITING', currentPc: '0xb4154000' },
  ]);

  // Terminal console output
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'GNU gdb / jdb (AndroTerm Android Debugger Engine v2.4)',
    'Copyright (C) 2026 Free Software Foundation & Android Open Source Project.',
    `Target environment: Android 15 (Linux 6.1 aarch64), PID: 3124 [com.androterm.app]`,
    `Reading symbols from ${targetFile}... done.`,
    'Breakpoint 1 at line 3: file ' + targetFile + ', line 3.',
    'Program received signal SIGTRAP, Trace/breakpoint trap.',
    '=> Line 3: const tier = user.membership.tier; (user is null!)',
    'Type "help" for a list of commands. Type "c" to continue or "n" to step.',
  ]);

  const [commandInput, setCommandInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<'variables' | 'stack' | 'breakpoints' | 'registers'>('variables');
  const [isAiDiagnosing, setIsAiDiagnosing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load source file on open or targetFile change
  useEffect(() => {
    if (!isOpen) return;

    let code = initialCode;
    if (!code) {
      const file = globalVFS.readFile(targetFile.startsWith('/') ? targetFile : `/home/user/${targetFile}`);
      if (file) {
        code = file.content;
      } else {
        // Fallback default sample code
        code = `// Sample buggy JavaScript code
function calculateUserDiscount(user, cartTotal) {
  // BUG: user is null, accessing user.membership causes NullPointerException!
  const tier = user.membership.tier; 
  if (tier === 'VIP') {
    return cartTotal * 0.8;
  }
  return cartTotal;
}

// Running this will throw TypeError: Cannot read properties of undefined
const result = calculateUserDiscount(null, 100);
console.log('Discounted Total:', result);`;
      }
    }

    setSourceCode(code);
    setActiveFileName(targetFile);
    setLines(code.split('\n'));
    setCurrentLine(3);
    setStatus('STOPPED');
  }, [isOpen, targetFile, initialCode]);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollTop = consoleEndRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  if (!isOpen) return null;

  const appendLog = (line: string) => {
    setConsoleLogs((prev) => [...prev, line]);
  };

  // Toggle Breakpoint on Line
  const toggleBreakpoint = (lineNum: number) => {
    playKeySound();
    setBreakpoints((prev) => {
      const exists = prev.find((b) => b.line === lineNum);
      if (exists) {
        appendLog(`Deleted breakpoint ${exists.id} at line ${lineNum}.`);
        return prev.filter((b) => b.line !== lineNum);
      } else {
        const nextId = prev.length > 0 ? Math.max(...prev.map((b) => b.id)) + 1 : 1;
        appendLog(`Breakpoint ${nextId} set at line ${lineNum} of ${activeFileName}.`);
        return [...prev, { id: nextId, line: lineNum, file: activeFileName, enabled: true, hitCount: 0 }];
      }
    });
  };

  // Step Over (n / next)
  const handleStepOver = () => {
    playReturnSound();
    let nextL = currentLine + 1;
    if (nextL > lines.length) {
      appendLog('[Inferior 1 (process 3124) exited normally with code 0]');
      setStatus('TERMINATED');
      setCurrentLine(lines.length);
      return;
    }

    // Check if stepped into bug line 3
    if (nextL === 3 && activeFileName.includes('buggy_app')) {
      setStatus('CRASHED');
      playBellSound();
      appendLog(`\n*** FATAL EXCEPTION: main (PID 3124) ***`);
      appendLog(`TypeError: Cannot read properties of null (reading 'membership') at calculateUserDiscount (${activeFileName}:3:20)`);
      appendLog(`Thread 1 "main" received signal SIGSEGV, Segmentation fault.`);
      appendLog(`Offending line 3: const tier = user.membership.tier;`);
      appendLog(`Hint: Type "diagnose" or click "⚡ AI Auto-Fix" to generate patch.`);
      setCurrentLine(3);
      return;
    }

    setCurrentLine(nextL);
    setStatus('STOPPED');
    appendLog(`(jdb) step-over: Line ${nextL}: ${lines[nextL - 1]?.trim() || ''}`);

    // Update variables
    if (nextL === 11) {
      setVariables((prev) => ({
        ...prev,
        result: { name: 'result', value: '<evaluating>', type: 'number', scope: 'local' },
      }));
    }
  };

  // Step Into (s / step)
  const handleStepInto = () => {
    playReturnSound();
    if (currentLine === 11) {
      setCurrentLine(2);
      appendLog(`(jdb) step-into: entered calculateUserDiscount(user=null, cartTotal=100) at line 2`);
    } else {
      handleStepOver();
    }
  };

  // Continue (c / continue)
  const handleContinue = () => {
    playReturnSound();
    // Find next enabled breakpoint
    const nextBp = breakpoints.find((b) => b.enabled && b.line > currentLine);
    if (nextBp) {
      setCurrentLine(nextBp.line);
      setStatus('STOPPED');
      nextBp.hitCount += 1;
      appendLog(`Continuing.\nBreakpoint ${nextBp.id}, calculateUserDiscount () at ${activeFileName}:${nextBp.line}`);
      appendLog(`=> ${lines[nextBp.line - 1]}`);
    } else {
      // Run to crash or end
      if (activeFileName.includes('buggy_app')) {
        setCurrentLine(3);
        setStatus('CRASHED');
        playBellSound();
        appendLog(`Continuing.`);
        appendLog(`Thread 1 "main" received signal SIGSEGV, Segmentation fault.`);
        appendLog(`Exception: TypeError: Cannot read properties of null (reading 'membership') at line 3.`);
      } else {
        setStatus('TERMINATED');
        appendLog(`Continuing.\n[Process 3124 exited normally]`);
      }
    }
  };

  // Restart / Reset
  const handleReset = () => {
    playReturnSound();
    setCurrentLine(1);
    setStatus('STOPPED');
    appendLog(`\nStarting program: /system/bin/app_process64 /data/app/${activeFileName}`);
    appendLog(`[New Thread 3124.3124 (main)]`);
    appendLog(`Breakpoint 1 reached at line 3.`);
    setCurrentLine(3);
  };

  // Execute console command string
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = commandInput.trim();
    if (!raw) return;

    playKeySound();
    appendLog(`(jdb) ${raw}`);
    setCommandHistory((prev) => [...prev, raw]);
    setHistoryIndex(-1);
    setCommandInput('');

    const [cmd, ...args] = raw.split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
      case '?':
        appendLog(`
DEBUGGER COMMAND MANUAL:
  run / r                 Start execution of target process
  continue / c            Continue program being debugged
  next / n                Step over next source line
  step / s / stepi        Step into next statement/call
  break <line> / b <line> Set breakpoint at line number
  info breakpoints / i b  List active breakpoints
  delete <id> / d <id>    Delete specified breakpoint
  print <var> / p <var>   Evaluate and print variable expression
  locals                  Display local variables in current frame
  backtrace / bt / where  Display call stack frames
  list / l                Show source lines around program counter
  threads                 List active Android threads
  registers / i r         Display ARM64 CPU registers (x0-x7, pc, sp)
  diagnose / fix          Consult Gemini AI to diagnose error & apply fix
  clear                   Clear console window
  kill / k                Kill current running process
  quit / q                Exit debugger console
        `.trim());
        break;

      case 'r':
      case 'run':
        handleReset();
        break;

      case 'n':
      case 'next':
        handleStepOver();
        break;

      case 's':
      case 'step':
        handleStepInto();
        break;

      case 'c':
      case 'continue':
        handleContinue();
        break;

      case 'b':
      case 'break': {
        const line = parseInt(args[0], 10);
        if (isNaN(line) || line < 1 || line > lines.length) {
          appendLog(`Error: invalid line number '${args[0]}'. File has ${lines.length} lines.`);
        } else {
          toggleBreakpoint(line);
        }
        break;
      }

      case 'd':
      case 'delete': {
        const id = parseInt(args[0], 10);
        setBreakpoints((prev) => prev.filter((b) => b.id !== id));
        appendLog(`Breakpoint ${id} deleted.`);
        break;
      }

      case 'i':
      case 'info': {
        if (args[0] === 'b' || args[0] === 'breakpoints') {
          appendLog(`Num     Type           Disp Enb Address            What`);
          breakpoints.forEach((b) => {
            appendLog(`${b.id.toString().padEnd(7)} breakpoint     keep ${b.enabled ? 'y  ' : 'n  '} 0x7fff89a0        in ${activeFileName}:${b.line} (hits: ${b.hitCount})`);
          });
        } else if (args[0] === 'r' || args[0] === 'registers') {
          appendLog(`ARM64 REGISTERS:
x0  : 0x0000000000000000 (0) [NULL pointer]
x1  : 0x0000000000000064 (100)
x2  : 0x0000007b82400010
pc  : 0x0000007fff89a024 <calculateUserDiscount+24>
sp  : 0x0000007ffffff450
lr  : 0x0000007fff89a118 <main+40>
pstate: 0x60000000 [flags: Z, negative=0, carry=1]`);
        } else {
          appendLog(`Unknown info command: info ${args[0]}. Try "info breakpoints" or "info registers"`);
        }
        break;
      }

      case 'p':
      case 'print': {
        const varName = args.join(' ');
        if (!varName) {
          appendLog('The history is empty or expression missing.');
        } else if (varName === 'user') {
          appendLog('$1 = (Object *) NULL');
        } else if (varName === 'cartTotal') {
          appendLog('$2 = 100');
        } else if (varName === 'user.membership') {
          appendLog('Cannot access member \'membership\' of NULL object pointer!');
        } else if (variables[varName]) {
          appendLog(`$3 = ${variables[varName].value}`);
        } else {
          appendLog(`$4 = undefined (variable '${varName}' not found in current frame)`);
        }
        break;
      }

      case 'locals':
        appendLog(`Current frame local variables:`);
        Object.values(variables).forEach((v) => {
          appendLog(`  ${v.name.padEnd(12)} = ${v.value} (${v.type})`);
        });
        break;

      case 'bt':
      case 'backtrace':
      case 'where':
        appendLog(`Call stack trace:`);
        callStack.forEach((f, idx) => {
          appendLog(`  #${idx}  ${f.address} in ${f.functionName} at ${f.fileName}:${f.line}`);
        });
        break;

      case 'l':
      case 'list': {
        const start = Math.max(1, currentLine - 3);
        const end = Math.min(lines.length, currentLine + 3);
        for (let i = start; i <= end; i++) {
          const marker = i === currentLine ? '=> ' : '   ';
          appendLog(`${marker}${i.toString().padStart(3, ' ')} | ${lines[i - 1]}`);
        }
        break;
      }

      case 'threads':
        appendLog(`Id   Target Id                                   Frame`);
        threads.forEach((t) => {
          const activeMarker = t.id === 1 ? '*' : ' ';
          appendLog(`${activeMarker} ${t.id}  Thread ${t.name.padEnd(30)} ${t.state} (pc: ${t.currentPc})`);
        });
        break;

      case 'clear':
        setConsoleLogs([]);
        break;

      case 'diagnose':
      case 'fix':
        handleAiDiagnose();
        break;

      case 'q':
      case 'quit':
        onClose();
        break;

      default:
        appendLog(`Undefined command: "${cmd}". Try "help".`);
    }
  };

  // AI Diagnostic Agent integration
  const handleAiDiagnose = async () => {
    setIsAiDiagnosing(true);
    playReturnSound();
    appendLog('\n[*] Running Gemini 3.8 Flash automated root-cause analysis...');

    try {
      const res = await fetch('/api/terminal/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sourceCode,
          errorText: `TypeError: Cannot read properties of null (reading 'membership') at line 3 of ${activeFileName}`,
          context: `Android Debug Console inspection. Current line is 3: const tier = user.membership.tier;`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAiReport(data.report);
        appendLog('\n' + data.report);
        playSuccessSound();
      } else {
        appendLog('[AI Error]: ' + (data.error || 'Failed to diagnose'));
      }
    } catch (e: any) {
      appendLog('[Connection Error]: ' + e.message);
    } finally {
      setIsAiDiagnosing(false);
    }
  };

  const handleApplyAiPatch = () => {
    if (!aiReport) return;
    const match = aiReport.match(/```(?:javascript|js|kotlin|ts|python)?\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      const fixedCode = match[1].trim();
      setSourceCode(fixedCode);
      setLines(fixedCode.split('\n'));
      globalVFS.writeFile(`/home/user/${activeFileName}`, fixedCode);
      if (onApplyFix) {
        onApplyFix(activeFileName, fixedCode);
      }
      appendLog(`\n[✓] Patch applied successfully to ${activeFileName}!`);
      setStatus('STOPPED');
      setCurrentLine(1);
      playSuccessSound();
    } else {
      appendLog('Could not automatically parse code block from AI report.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 font-mono animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-6xl bg-zinc-950 border border-amber-500/40 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'CRASHED'
                  ? 'bg-rose-500 animate-ping'
                  : status === 'RUNNING'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-bold text-amber-400">ANDRO-DEBUGGER CONSOLE // JDB & GDB EMULATOR</span>
            <span className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] text-zinc-300">
              Target: <span className="text-white font-semibold">{activeFileName}</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                status === 'CRASHED'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : status === 'STOPPED'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300'
              }`}
            >
              {status} {status === 'STOPPED' && `@ line ${currentLine}`}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Debug Controls Toolbar */}
        <div className="px-3 py-2 bg-zinc-900/70 border-b border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleContinue}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-black rounded text-xs font-bold transition shadow-sm"
              title="Continue execution (c)"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Continue (c)</span>
            </button>

            <button
              onClick={handleStepOver}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium transition border border-zinc-700"
              title="Step Over to next line (n)"
            >
              <StepForward className="w-3.5 h-3.5 text-sky-400" />
              <span>Step Over (n)</span>
            </button>

            <button
              onClick={handleStepInto}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium transition border border-zinc-700"
              title="Step Into function call (s)"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-amber-400" />
              <span>Step Into (s)</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition"
              title="Restart execution (r)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart (r)</span>
            </button>

            <button
              onClick={() => toggleBreakpoint(currentLine)}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 rounded text-xs transition"
              title="Toggle breakpoint on current line"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Toggle Breakpoint</span>
            </button>
          </div>

          {/* AI Debug Agent Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAiDiagnose}
              disabled={isAiDiagnosing}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded transition shadow-md active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiDiagnosing ? 'Analyzing...' : 'AI Auto-Diagnose'}</span>
            </button>

            {aiReport && (
              <button
                onClick={handleApplyAiPatch}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Patch</span>
              </button>
            )}
          </div>
        </div>

        {/* Middle Area: Source Code & Inspection Tabs */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-800 min-h-[300px]">
          {/* Left: Source Code with Breakpoint column */}
          <div className="col-span-1 md:col-span-7 flex flex-col bg-black/90 overflow-hidden">
            <div className="px-3 py-1.5 bg-zinc-950 border-b border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>SOURCE // Click line number to toggle breakpoint</span>
              <span className="text-zinc-600">{lines.length} lines</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs select-text">
              {lines.map((lineContent, idx) => {
                const lineNum = idx + 1;
                const isCurrent = lineNum === currentLine;
                const hasBreakpoint = breakpoints.some((b) => b.line === lineNum && b.enabled);

                return (
                  <div
                    key={lineNum}
                    className={`flex items-center gap-2 py-0.5 px-1 rounded transition group ${
                      isCurrent
                        ? status === 'CRASHED'
                          ? 'bg-rose-950/60 text-rose-200 border-l-2 border-rose-500'
                          : 'bg-amber-950/40 text-amber-200 border-l-2 border-amber-400'
                        : 'hover:bg-zinc-900/60 text-zinc-300'
                    }`}
                  >
                    {/* Breakpoint dot & toggle */}
                    <button
                      onClick={() => toggleBreakpoint(lineNum)}
                      className="w-5 flex items-center justify-center flex-shrink-0"
                      title="Click to toggle breakpoint"
                    >
                      {hasBreakpoint ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500 animate-pulse" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-transparent group-hover:bg-zinc-700" />
                      )}
                    </button>

                    {/* Program counter indicator */}
                    <div className="w-5 text-center flex-shrink-0">
                      {isCurrent && (
                        <span className={`font-bold ${status === 'CRASHED' ? 'text-rose-400' : 'text-amber-400'}`}>
                          =&gt;
                        </span>
                      )}
                    </div>

                    {/* Line number */}
                    <span className="w-7 text-right text-zinc-600 select-none text-[11px] flex-shrink-0">
                      {lineNum}
                    </span>

                    {/* Code text */}
                    <pre className="flex-1 overflow-x-auto whitespace-pre font-mono text-xs">
                      {lineContent}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Inspection Inspector Tabs (Variables, Stack, Breakpoints, Registers) */}
          <div className="col-span-1 md:col-span-5 flex flex-col bg-zinc-950 overflow-hidden">
            {/* Inspector Navigation Tabs */}
            <div className="flex items-center border-b border-zinc-800 bg-zinc-900/80 text-xs">
              {[
                { id: 'variables', label: 'Variables', icon: Terminal },
                { id: 'stack', label: 'Call Stack', icon: Layers },
                { id: 'breakpoints', label: 'Breakpoints', icon: Square },
                { id: 'registers', label: 'ARM64 Regs', icon: Cpu },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 font-medium transition flex-1 justify-center border-b-2 ${
                      active
                        ? 'border-amber-400 text-white font-bold bg-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inspector Content */}
            <div className="flex-1 overflow-y-auto p-3 text-xs font-mono select-text">
              {activeTab === 'variables' && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
                    Frame Scope Locals & Watchpoints:
                  </div>
                  {Object.values(variables).map((v) => (
                    <div
                      key={v.name}
                      className="p-1.5 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-between"
                    >
                      <span className="text-sky-300 font-semibold">{v.name}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold ${
                            v.value === 'null' || v.value === '<undefined>'
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {v.value}
                        </span>
                        <span className="text-[10px] text-zinc-500">({v.type})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'stack' && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
                    Thread 1 Stack Frames:
                  </div>
                  {callStack.map((f, i) => (
                    <div
                      key={f.id}
                      className={`p-2 rounded border transition ${
                        i === 0
                          ? 'bg-amber-950/20 border-amber-500/40 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>#{i} {f.functionName}</span>
                        <span className="text-zinc-500 text-[10px]">{f.address}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        at {f.fileName}:{f.line}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'breakpoints' && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
                    Active Breakpoints:
                  </div>
                  {breakpoints.map((bp) => (
                    <div
                      key={bp.id}
                      className="p-2 bg-zinc-900 rounded border border-zinc-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span className="font-bold text-zinc-200">
                          #{bp.id} line {bp.line}
                        </span>
                        <span className="text-zinc-500 text-[11px]">in {bp.file}</span>
                      </div>
                      <button
                        onClick={() => toggleBreakpoint(bp.line)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'registers' && (
                <div className="space-y-1 text-zinc-300">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
                    ARM64 Registers (aarch64):
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { reg: 'x0', val: '0x0000000000000000', label: 'NULL' },
                      { reg: 'x1', val: '0x0000000000000064', label: '100' },
                      { reg: 'x2', val: '0x0000007b82400010', label: '' },
                      { reg: 'x3', val: '0x0000000000000008', label: '' },
                      { reg: 'sp', val: '0x0000007ffffff450', label: 'Stack Ptr' },
                      { reg: 'pc', val: '0x0000007fff89a024', label: 'Program Counter' },
                      { reg: 'lr', val: '0x0000007fff89a118', label: 'Link Register' },
                      { reg: 'pstate', val: '0x60000000', label: 'Flags' },
                    ].map((r) => (
                      <div key={r.reg} className="p-1.5 bg-zinc-900 border border-zinc-800 rounded">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-amber-400 font-bold">{r.reg}</span>
                          <span className="text-zinc-500">{r.label}</span>
                        </div>
                        <div className="text-[10px] text-zinc-300 truncate font-mono">{r.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Interactive Debugger Console CLI */}
        <div className="h-44 sm:h-52 bg-black border-t border-zinc-800 flex flex-col font-mono text-xs">
          <div className="px-3 py-1 bg-zinc-900/90 border-b border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Terminal className="w-3.5 h-3.5" />
              <span>DEBUGGER COMMAND INTERPRETER (jdb / gdb)</span>
            </div>
            <span className="text-zinc-500">Type &apos;help&apos; for command list</span>
          </div>

          {/* Console stream */}
          <div
            ref={consoleEndRef}
            className="flex-1 overflow-y-auto p-2 text-zinc-300 space-y-0.5 select-text font-mono text-[11px] leading-relaxed"
          >
            {consoleLogs.map((log, index) => (
              <div
                key={index}
                className={`whitespace-pre-wrap ${
                  log.startsWith('***') || log.includes('SIGSEGV') || log.includes('TypeError')
                    ? 'text-rose-400 font-bold'
                    : log.startsWith('(jdb)')
                    ? 'text-sky-300 font-semibold'
                    : log.startsWith('[✓]')
                    ? 'text-emerald-400'
                    : 'text-zinc-300'
                }`}
              >
                {log}
              </div>
            ))}
          </div>

          {/* Command Prompt Line */}
          <form
            onSubmit={handleCommandSubmit}
            className="p-1.5 bg-zinc-950 border-t border-zinc-800/80 flex items-center gap-2"
          >
            <span className="text-amber-400 font-bold pl-1.5 select-none">(jdb)</span>
            <input
              ref={inputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (commandHistory.length === 0) return;
                  const newIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
                  setHistoryIndex(newIdx);
                  setCommandInput(commandHistory[newIdx] || '');
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (historyIndex === -1) return;
                  const newIdx = historyIndex + 1;
                  if (newIdx >= commandHistory.length) {
                    setHistoryIndex(-1);
                    setCommandInput('');
                  } else {
                    setHistoryIndex(newIdx);
                    setCommandInput(commandHistory[newIdx] || '');
                  }
                }
              }}
              placeholder="e.g. 'c' (continue), 'n' (next), 'p user' (inspect), 'b 5' (breakpoint), 'help'"
              className="flex-1 bg-transparent text-white outline-none border-none text-xs font-mono"
              autoFocus
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[11px] transition"
            >
              Exec
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
