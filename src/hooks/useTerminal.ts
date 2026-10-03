import { useState, useCallback, useRef } from 'react';
import { TerminalLine, TerminalSession, ThemeName } from '../types/terminal';
import { globalVFS } from '../utils/vfs';
import { playReturnSound, playBellSound, playSuccessSound } from '../utils/sound';

export function useTerminal() {
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: 'session-1',
      name: 'bash [1]',
      history: [
        'neofetch',
        'ls -la',
        'cat /etc/os-release',
        'ocr /sdcard/DCIM/receipt_ocr_sample.png',
        'debug projects/buggy_app.js',
        'adb devices',
      ],
      historyIndex: -1,
      lines: [
        {
          id: 'init-1',
          type: 'info',
          text: '\x1b[32;1mAndroid Linux 6.1.75-aarch64 #1 SMP PREEMPT\x1b[0m\n\x1b[36mAndroTerm Pro Workstation v2.4 (Android 15 / Termux Environment)\x1b[0m\nType \x1b[33;1mhelp\x1b[0m for command list or try \x1b[32mneofetch\x1b[0m, \x1b[35mcamera\x1b[0m, \x1b[36mocr <image>\x1b[0m, or \x1b[31;1mdebug <image/script>\x1b[0m.\n',
          timestamp: Date.now(),
        },
      ],
      cwd: '/home/user',
      env: { USER: 'u0_a245', HOME: '/home/user', SHELL: '/bin/bash', TERM: 'xterm-256color' },
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState('session-1');
  const [inputBuffer, setInputBuffer] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Active editors / modals
  const [nanoFile, setNanoFile] = useState<{ path: string; content: string } | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt?: string } | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCodeStudio, setShowCodeStudio] = useState(false);
  const [activeCodeStudioFile, setActiveCodeStudioFile] = useState<string>('projects/buggy_app.js');
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [activeDebugTarget, setActiveDebugTarget] = useState<string>('projects/buggy_app.js');
  const [activeDebugCode, setActiveDebugCode] = useState<string | undefined>(undefined);
  const [showOcrStudio, setShowOcrStudio] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const updateSession = useCallback(
    (updater: (session: TerminalSession) => TerminalSession) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? updater(s) : s))
      );
    },
    [activeSessionId]
  );

  const addLines = useCallback(
    (newLines: TerminalLine[]) => {
      updateSession((s) => ({
        ...s,
        lines: [...s.lines, ...newLines],
      }));
    },
    [updateSession]
  );

  const clearScreen = useCallback(() => {
    updateSession((s) => ({
      ...s,
      lines: [],
    }));
  }, [updateSession]);

  const clearHistory = useCallback(() => {
    updateSession((s) => ({
      ...s,
      history: [],
      historyIndex: -1,
    }));
  }, [updateSession]);

  // Execute terminal command string
  const executeCommand = async (rawCmd: string, promptStyle: 'termux' | 'root' | 'ubuntu' = 'termux') => {
    const trimmed = rawCmd.trim();
    if (!trimmed) {
      // Just print empty prompt line
      addLines([
        {
          id: `cmd-${Date.now()}`,
          type: 'input',
          text: '',
          commandPrompt: getPromptPrefix(activeSession.cwd, activeSession.env.USER, promptStyle),
          timestamp: Date.now(),
        },
      ]);
      playReturnSound();
      return;
    }

    playReturnSound();

    const currentRepl = activeSession.replMode || 'none';
    const promptPrefix = getPromptPrefix(activeSession.cwd, activeSession.env.USER, promptStyle, currentRepl);

    // Append to history
    updateSession((s) => ({
      ...s,
      history: [...s.history.filter((h) => h !== trimmed), trimmed],
      historyIndex: -1,
      lines: [
        ...s.lines,
        {
          id: `cmd-${Date.now()}`,
          type: 'input',
          text: trimmed,
          commandPrompt: promptPrefix,
          timestamp: Date.now(),
        },
      ],
    }));

    // Handle interactive Node REPL
    if (currentRepl === 'node') {
      if (trimmed === '.exit' || trimmed === 'exit' || trimmed === 'process.exit()') {
        updateSession((s) => ({ ...s, replMode: 'none' }));
        addLines([
          {
            id: `node-exit-${Date.now()}`,
            type: 'info',
            text: '\x1b[32mExiting Node.js REPL.\x1b[0m',
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      if (trimmed === '.help') {
        addLines([
          {
            id: `node-help-${Date.now()}`,
            type: 'output',
            text: '.clear    Break evaluation context\n.exit     Exit the REPL\n.help     Print this help message',
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      try {
        // eslint-disable-next-line no-eval
        const result = eval(trimmed);
        const formatResult =
          result === undefined
            ? '\x1b[90mundefined\x1b[0m'
            : typeof result === 'string'
            ? `\x1b[32m'${result}'\x1b[0m`
            : typeof result === 'number' || typeof result === 'boolean'
            ? `\x1b[33m${result}\x1b[0m`
            : typeof result === 'function'
            ? `\x1b[36m[Function: ${result.name || 'anonymous'}]\x1b[0m`
            : `\x1b[36m${JSON.stringify(result, null, 2)}\x1b[0m`;

        addLines([
          {
            id: `node-res-${Date.now()}`,
            type: 'output',
            text: formatResult,
            timestamp: Date.now(),
          },
        ]);
      } catch (e: any) {
        addLines([
          {
            id: `node-err-${Date.now()}`,
            type: 'error',
            text: `\x1b[31;1m${e.name}: ${e.message}\x1b[0m`,
            timestamp: Date.now(),
          },
        ]);
      }
      return;
    }

    // Handle interactive Python REPL
    if (currentRepl === 'python') {
      if (trimmed === 'exit()' || trimmed === 'quit()' || trimmed === 'exit') {
        updateSession((s) => ({ ...s, replMode: 'none' }));
        addLines([
          {
            id: `py-exit-${Date.now()}`,
            type: 'info',
            text: '\x1b[33mExiting Python 3.12 REPL.\x1b[0m',
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      try {
        // Evaluate simple arithmetic or expressions safely
        if (/^[0-9+\-*/%().\s]+$/.test(trimmed)) {
          // eslint-disable-next-line no-eval
          const val = eval(trimmed);
          addLines([
            { id: `py-res-${Date.now()}`, type: 'output', text: String(val), timestamp: Date.now() },
          ]);
        } else if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
          const inner = trimmed.slice(6, -1);
          // eslint-disable-next-line no-eval
          const val = eval(inner);
          addLines([
            { id: `py-res-${Date.now()}`, type: 'output', text: String(val), timestamp: Date.now() },
          ]);
        } else {
          addLines([
            {
              id: `py-res-${Date.now()}`,
              type: 'output',
              text: `[Python statement executed: ${trimmed}]`,
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (e: any) {
        addLines([
          {
            id: `py-err-${Date.now()}`,
            type: 'error',
            text: `\x1b[31;1mSyntaxError: invalid syntax\x1b[0m`,
            timestamp: Date.now(),
          },
        ]);
      }
      return;
    }

    setIsExecuting(true);

    try {
      await runShellCommand(trimmed);
    } catch (err: any) {
      addLines([
        {
          id: `err-${Date.now()}`,
          type: 'error',
          text: `\x1b[31;1mbash: ${err.message || 'Execution error'}\x1b[0m`,
          timestamp: Date.now(),
        },
      ]);
      playBellSound();
    } finally {
      setIsExecuting(false);
    }
  };

  const runShellCommand = async (cmdStr: string) => {
    const parts = cmdStr.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case 'clear':
        clearScreen();
        break;

      case 'help': {
        const helpText = `
\x1b[1;36mANDROTERM PRO - BUILT-IN COMMAND REFERENCE:\x1b[0m

\x1b[1;33mVISION & DEBUGGING CAPABILITIES:\x1b[0m
  \x1b[32mcamera\x1b[0m                     Open device camera viewfinder to capture documents/screens
  \x1b[32mimgview <file.png>\x1b[0m         Render image & metadata in terminal stream with zoom modal
  \x1b[32mocr <file.png> [prompt]\x1b[0m    Extract text, code & tables from image via Gemini 3.8 Flash
  \x1b[32mdebug <file.png|script>\x1b[0m    Diagnose screenshot errors or code files with AI & generate patch
  \x1b[32msample-debug\x1b[0m               Instantly debug preloaded Android NPE crash screenshot

\x1b[1;33mANDROID & SYSTEM TOOLS:\x1b[0m
  \x1b[32madb devices\x1b[0m                List connected Android devices & emulators
  \x1b[32madb logcat\x1b[0m                 Stream simulated Android runtime logcat
  \x1b[32madb shell\x1b[0m                  Switch to root shell environment
  \x1b[32mtop\x1b[0m / \x1b[32mhtop\x1b[0m                 Interactive real-time process monitor (q to quit)
  \x1b[32mneofetch\x1b[0m                   Display Android & Linux ASCII hardware specs
  \x1b[32mhistory [-c]\x1b[0m               Display past commands overlay modal or list
  \x1b[32mai "<prompt>"\x1b[0m              Ask Gemini for Linux/Android commands

\x1b[1;33mFILESYSTEM & NAVIGATION:\x1b[0m
  \x1b[32mls [-la] [path]\x1b[0m            List files and directories
  \x1b[32mcd <dir>\x1b[0m                   Change directory (e.g. cd /sdcard/DCIM)
  \x1b[32mpwd\x1b[0m                        Print current working directory
  \x1b[32mcat <file>\x1b[0m                 Print file contents (or view image)
  \x1b[32mmkdir <dir>\x1b[0m                Create new directory
  \x1b[32mtouch <file>\x1b[0m               Create empty file
  \x1b[32mrm [-rf] <file>\x1b[0m            Remove file or directory
  \x1b[32mecho <text> [> file]\x1b[0m       Print text or write to file
  \x1b[32mnano <file>\x1b[0m                Fullscreen interactive text editor
  \x1b[32mnode / python <script>\x1b[0m     Run JavaScript / Python script in browser sandbox
  \x1b[32mcurl <url>\x1b[0m                 Fetch HTTP endpoint
        `.trim();
        addLines([{ id: `help-${Date.now()}`, type: 'output', text: helpText, timestamp: Date.now() }]);
        break;
      }

      case 'pwd':
        addLines([{ id: `pwd-${Date.now()}`, type: 'output', text: activeSession.cwd, timestamp: Date.now() }]);
        break;

      case 'whoami':
        addLines([{ id: `who-${Date.now()}`, type: 'output', text: activeSession.env.USER, timestamp: Date.now() }]);
        break;

      case 'date':
        addLines([{ id: `date-${Date.now()}`, type: 'output', text: new Date().toString(), timestamp: Date.now() }]);
        break;

      case 'uptime':
        addLines([{ id: `up-${Date.now()}`, type: 'output', text: ' 22:18:40 up 4:12,  1 user,  load average: 0.38, 0.42, 0.35', timestamp: Date.now() }]);
        break;

      case 'uname':
        addLines([{ id: `uname-${Date.now()}`, type: 'output', text: 'Linux androterm-pro 6.1.75-android15-11-g8812c3f #1 SMP PREEMPT aarch64 Android', timestamp: Date.now() }]);
        break;

      case 'history': {
        if (args[0] === '-c' || args[0] === '--clear') {
          clearHistory();
          addLines([
            {
              id: `hist-c-${Date.now()}`,
              type: 'success',
              text: '\x1b[32m[✓] Command history cleared.\x1b[0m',
              timestamp: Date.now(),
            },
          ]);
          break;
        }

        setShowHistoryModal(true);
        if (activeSession.history.length === 0) {
          addLines([
            {
              id: `hist-${Date.now()}`,
              type: 'info',
              text: 'Command history is empty.',
              timestamp: Date.now(),
            },
          ]);
        } else {
          const formatted = activeSession.history
            .map((cmd, idx) => `  ${String(idx + 1).padStart(4, ' ')}  ${cmd}`)
            .join('\n');
          addLines([
            {
              id: `hist-${Date.now()}`,
              type: 'output',
              text: `${formatted}\n\x1b[36m[Tip: Click any command in the Command History overlay modal to instantly re-execute]\x1b[0m`,
              timestamp: Date.now(),
            },
          ]);
        }
        break;
      }

      case 'cd': {
        const target = args[0] || '~';
        const resolved = globalVFS.resolvePath(activeSession.cwd, target);
        const node = globalVFS.getNode(resolved);
        if (!node) {
          throw new Error(`cd: ${target}: No such file or directory`);
        }
        if (!node.isDir) {
          throw new Error(`cd: ${target}: Not a directory`);
        }
        updateSession((s) => ({ ...s, cwd: resolved }));
        break;
      }

      case 'ls': {
        const isLong = args.includes('-l') || args.includes('-la') || args.includes('-al');
        const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
        const targetArg = args.find((a) => !a.startsWith('-')) || '.';
        const targetPath = globalVFS.resolvePath(activeSession.cwd, targetArg);
        const items = globalVFS.listDirectory(targetPath);

        if (items.length === 0) {
          break;
        }

        if (isLong) {
          const lines = items
            .filter((item) => showAll || !item.name.startsWith('.'))
            .map((item) => {
              const perms = item.permissions || (item.isDir ? 'drwxr-xr-x' : '-rw-r--r--');
              const sizeStr = item.size.toString().padStart(6, ' ');
              const dateStr = new Date(item.updatedAt).toLocaleDateString();
              const nameStyled = item.isDir
                ? `\x1b[34;1m${item.name}/\x1b[0m`
                : item.mimeType?.startsWith('image/')
                ? `\x1b[35;1m${item.name}\x1b[0m`
                : item.name.endsWith('.sh') || item.name.endsWith('.js')
                ? `\x1b[32;1m${item.name}*\x1b[0m`
                : item.name;
              return `${perms}  u0_a245  u0_a245  ${sizeStr}  ${dateStr}  ${nameStyled}`;
            });
          addLines([{ id: `ls-${Date.now()}`, type: 'output', text: lines.join('\n'), timestamp: Date.now() }]);
        } else {
          const names = items
            .filter((item) => showAll || !item.name.startsWith('.'))
            .map((item) => {
              if (item.isDir) return `\x1b[34;1m${item.name}/\x1b[0m`;
              if (item.mimeType?.startsWith('image/')) return `\x1b[35;1m${item.name}\x1b[0m`;
              if (item.name.endsWith('.sh') || item.name.endsWith('.js')) return `\x1b[32;1m${item.name}\x1b[0m`;
              return item.name;
            });
          addLines([{ id: `ls-${Date.now()}`, type: 'output', text: names.join('   '), timestamp: Date.now() }]);
        }
        break;
      }

      case 'cat': {
        if (!args[0]) throw new Error('cat: missing operand');
        const resolved = globalVFS.resolvePath(activeSession.cwd, args[0]);
        const file = globalVFS.readFile(resolved);
        if (!file) throw new Error(`cat: ${args[0]}: No such file or directory`);

        if (file.mimeType?.startsWith('image/') || file.content.startsWith('data:image/')) {
          // If image, render image preview line!
          addLines([
            {
              id: `img-${Date.now()}`,
              type: 'image',
              imageSrc: file.content,
              imageAlt: args[0],
              timestamp: Date.now(),
            },
          ]);
        } else {
          addLines([{ id: `cat-${Date.now()}`, type: 'output', text: file.content, timestamp: Date.now() }]);
        }
        break;
      }

      case 'mkdir': {
        if (!args[0]) throw new Error('mkdir: missing operand');
        const resolved = globalVFS.resolvePath(activeSession.cwd, args[0]);
        const success = globalVFS.createDirectory(resolved);
        if (!success) throw new Error(`mkdir: cannot create directory '${args[0]}': File exists or invalid path`);
        break;
      }

      case 'touch': {
        if (!args[0]) throw new Error('touch: missing file operand');
        const resolved = globalVFS.resolvePath(activeSession.cwd, args[0]);
        globalVFS.writeFile(resolved, '');
        break;
      }

      case 'rm': {
        if (!args[0]) throw new Error('rm: missing operand');
        const target = args.find((a) => !a.startsWith('-')) || '';
        const resolved = globalVFS.resolvePath(activeSession.cwd, target);
        const success = globalVFS.removeNode(resolved);
        if (!success) throw new Error(`rm: cannot remove '${target}': No such file or directory`);
        break;
      }

      case 'echo': {
        const fullText = args.join(' ');
        if (fullText.includes('>')) {
          const [left, right] = fullText.split('>');
          const content = left.trim().replace(/^["']|["']$/g, '');
          const filename = right.trim();
          const resolved = globalVFS.resolvePath(activeSession.cwd, filename);
          globalVFS.writeFile(resolved, content + '\n');
        } else {
          addLines([{ id: `echo-${Date.now()}`, type: 'output', text: fullText.replace(/^["']|["']$/g, ''), timestamp: Date.now() }]);
        }
        break;
      }

      case 'neofetch': {
        const ascii = `
\x1b[32;1m       .-.         \x1b[0m  \x1b[1;32mu0_a245@android-desktop\x1b[0m
\x1b[32;1m      /   \\        \x1b[0m  ----------------------
\x1b[32;1m     |  _  |       \x1b[0m  \x1b[33mOS:\x1b[0m Android 15 (Vanilla Ice Cream) aarch64
\x1b[32;1m   .-|-( )-|-.     \x1b[0m  \x1b[33mHost:\x1b[0m Pixel 9 Pro / Qualcomm Snapdragon 8 Gen 3
\x1b[32;1m  /  |     |  \\    \x1b[0m  \x1b[33mKernel:\x1b[0m 6.1.75-androterm
\x1b[32;1m |   |     |   |   \x1b[0m  \x1b[33mUptime:\x1b[0m 4 hours, 18 mins
\x1b[32;1m |   |     |   |   \x1b[0m  \x1b[33mPackages:\x1b[0m 184 (pkg, dpkg, termux)
\x1b[32;1m  \\  |     |  /    \x1b[0m  \x1b[33mShell:\x1b[0m bash 5.2.26
\x1b[32;1m   \`-|     |-\`     \x1b[0m  \x1b[33mTerminal:\x1b[0m AndroTerm Pro Web/Mobile
\x1b[32;1m     |  _  |       \x1b[0m  \x1b[33mCPU:\x1b[0m Octa-Core Cortex-X4 @ 3.3 GHz
\x1b[32;1m     | | | |       \x1b[0m  \x1b[33mMemory:\x1b[0m 3214MiB / 7840MiB
\x1b[32;1m     \`-\` \`-\`       \x1b[0m  \x1b[33mStorage:\x1b[0m /sdcard (256 GB UFS 4.0)
\x1b[40m   \x1b[41m   \x1b[42m   \x1b[43m   \x1b[44m   \x1b[45m   \x1b[46m   \x1b[47m   \x1b[0m
        `.trim();
        addLines([{ id: `neo-${Date.now()}`, type: 'output', text: ascii, timestamp: Date.now() }]);
        break;
      }

      case 'top':
      case 'htop':
        setShowTop(true);
        break;

      case 'nano':
      case 'edit': {
        const filename = args[0] || 'untitled.txt';
        const resolved = globalVFS.resolvePath(activeSession.cwd, filename);
        const existing = globalVFS.readFile(resolved);
        setNanoFile({
          path: resolved,
          content: existing ? existing.content : '',
        });
        break;
      }

      case 'camera':
        setShowCamera(true);
        break;

      case 'imgview':
      case 'view': {
        if (!args[0]) throw new Error('imgview: specify image file path (e.g. imgview /sdcard/DCIM/receipt_ocr_sample.png)');
        const resolved = globalVFS.resolvePath(activeSession.cwd, args[0]);
        const file = globalVFS.readFile(resolved);
        if (!file) throw new Error(`imgview: ${args[0]}: file not found`);
        if (!file.content.startsWith('data:image/')) {
          throw new Error(`imgview: ${args[0]} is not a valid image`);
        }
        addLines([
          {
            id: `img-${Date.now()}`,
            type: 'image',
            imageSrc: file.content,
            imageAlt: args[0],
            timestamp: Date.now(),
          },
        ]);
        break;
      }

      case 'ocr': {
        if (!args[0]) {
          setShowOcrStudio(true);
          break;
        }
        const resolved = globalVFS.resolvePath(activeSession.cwd, args[0]);
        const file = globalVFS.readFile(resolved);
        if (!file) throw new Error(`ocr: ${args[0]}: file not found`);
        if (!file.content.startsWith('data:image/')) {
          throw new Error(`ocr: ${args[0]} is not an image file`);
        }

        addLines([
          {
            id: `ocr-proc-${Date.now()}`,
            type: 'info',
            text: `\x1b[36m[*] Sending image ${args[0]} to Gemini 3.8 Flash OCR engine...\x1b[0m`,
            timestamp: Date.now(),
          },
        ]);

        const customPrompt = args.slice(1).join(' ');
        const res = await fetch('/api/terminal/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: file.content,
            prompt: customPrompt,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'OCR processing failed');
        }

        playSuccessSound();

        // Save OCR text to .txt file automatically in same directory
        const txtPath = resolved.replace(/\.[^/.]+$/, '') + '_ocr.txt';
        globalVFS.writeFile(txtPath, data.text);

        addLines([
          {
            id: `ocr-res-${Date.now()}`,
            type: 'ocr-result',
            ocrText: data.text,
            ocrLineCount: data.lineCount,
            text: data.text,
            timestamp: Date.now(),
          },
          {
            id: `ocr-saved-${Date.now()}`,
            type: 'success',
            text: `\x1b[32m[✓] Extracted text saved to: ${txtPath} (run "cat ${txtPath}" or "code ${txtPath}")\x1b[0m`,
            timestamp: Date.now(),
          },
        ]);
        break;
      }

      case 'code':
      case 'ide':
      case 'editor': {
        if (args[0]) {
          setActiveCodeStudioFile(args[0]);
        }
        setShowCodeStudio(true);
        break;
      }

      case 'jdb':
      case 'gdb':
      case 'debug-console': {
        if (args[0]) {
          setActiveDebugTarget(args[0]);
        }
        setShowDebugConsole(true);
        break;
      }

      case 'debug': {
        if (!args[0]) {
          throw new Error('debug: usage: debug <image_or_script_path> (e.g. debug /sdcard/DCIM/Screenshots/error_stacktrace.png or debug projects/buggy_app.js)');
        }

        const resolved = globalVFS.resolvePath(activeSession.cwd, args[0]);
        const file = globalVFS.readFile(resolved);
        if (!file) throw new Error(`debug: ${args[0]}: file not found`);

        const isImage = file.content.startsWith('data:image/');
        addLines([
          {
            id: `debug-start-${Date.now()}`,
            type: 'info',
            text: isImage
              ? `\x1b[33m[*] Analyzing visual error screenshot with Gemini 3.8 Flash Vision...\x1b[0m`
              : `\x1b[33m[*] Analyzing code in ${args[0]} with Gemini 3.8 Flash Debugger...\x1b[0m`,
            timestamp: Date.now(),
          },
        ]);

        const payload: any = {};
        if (isImage) {
          payload.image = file.content;
          payload.context = `Target file: ${args[0]}. This is a screenshot of code or error log taken by the user.`;
        } else {
          payload.code = file.content;
          payload.context = `Target file: ${args[0]}. Check for bugs, syntax errors, or runtime exceptions.`;
        }

        const res = await fetch('/api/terminal/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate diagnostic report');
        }

        playSuccessSound();

        // Try extracting patch code fence if present
        let fixedCode: string | undefined = undefined;
        const codeBlockMatch = data.report.match(/```(?:javascript|js|typescript|ts|python|kotlin|bash)?\n([\s\S]*?)\n```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          fixedCode = codeBlockMatch[1].trim();
        }

        addLines([
          {
            id: `debug-res-${Date.now()}`,
            type: 'debug-report',
            debugReport: data.report,
            debugOriginalTarget: resolved,
            debugFixedCode: fixedCode,
            timestamp: Date.now(),
          },
        ]);
        break;
      }

      case 'sample-debug': {
        // Quick trigger for sample screenshot
        await runShellCommand('debug /sdcard/DCIM/Screenshots/error_stacktrace.png');
        break;
      }

      case 'adb': {
        const sub = args[0];
        if (!sub || sub === 'help') {
          addLines([
            {
              id: `adb-help-${Date.now()}`,
              type: 'output',
              text: `Android Debug Bridge version 1.0.41\nCommands:\n  devices [-l]            List attached devices\n  logcat                  View Android runtime log\n  shell                   Open Android root shell\n  install <file.apk>      Install an Android package\n  screencap <file.png>    Capture screenshot of device`,
              timestamp: Date.now(),
            },
          ]);
          break;
        }

        if (sub === 'devices') {
          addLines([
            {
              id: `adb-dev-${Date.now()}`,
              type: 'output',
              text: `List of devices attached\nemulator-5554          device product:tangorpro model:Pixel_Tablet device:tangorpro\nSM-S928B-09941a82      device product:e3q model:Galaxy_S24_Ultra device:e3q`,
              timestamp: Date.now(),
            },
          ]);
        } else if (sub === 'logcat') {
          const sampleLogcat = `
\x1b[36m09-29 22:20:01.102  1042  1042 I ActivityManager: START u0 {act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] cmp=com.termux/.app.TermuxActivity}\x1b[0m
\x1b[32m09-29 22:20:01.214  3124  3124 D TermuxService: Background daemon started, PID: 3124\x1b[0m
\x1b[33m09-29 22:20:01.350   489   489 W SurfaceFlinger: client=0xb400007b82 buffer queue full (16ms latency)\x1b[0m
\x1b[31;1m09-29 22:20:01.589  3124  3124 E AndroidRuntime: FATAL EXCEPTION: main\x1b[0m
\x1b[31m09-29 22:20:01.590  3124  3124 E AndroidRuntime: Process: com.androterm.app, PID: 3124\x1b[0m
\x1b[31m09-29 22:20:01.591  3124  3124 E AndroidRuntime: java.lang.NullPointerException: Attempt to invoke virtual method 'int java.lang.String.length()' on a null object reference\x1b[0m
\x1b[35m09-29 22:20:01.592  3124  3124 E AndroidRuntime:    at com.androterm.app.TerminalSession.executeCommand(TerminalSession.kt:142)\x1b[0m
\x1b[32m09-29 22:20:01.602  1042  1042 I DropBoxManagerService: App crash report saved to /data/system/dropbox/crash_dump_3124.txt\x1b[0m
          `.trim();
          addLines([
            { id: `logcat-${Date.now()}`, type: 'output', text: sampleLogcat, timestamp: Date.now() },
          ]);
        } else if (sub === 'shell') {
          updateSession((s) => ({
            ...s,
            env: { ...s.env, USER: 'root' },
          }));
          addLines([
            { id: `adb-sh-${Date.now()}`, type: 'success', text: '\x1b[32mConnected to Android Shell (root@generic_x86_64:/ #)\x1b[0m', timestamp: Date.now() },
          ]);
        } else if (sub === 'screencap') {
          const dest = args[1] || '/sdcard/screen.png';
          const resolved = globalVFS.resolvePath(activeSession.cwd, dest);
          const sampleImg = globalVFS.readFile('/sdcard/DCIM/Screenshots/error_stacktrace.png')?.content || '';
          globalVFS.writeFile(resolved, sampleImg);
          addLines([
            { id: `adb-cap-${Date.now()}`, type: 'success', text: `\x1b[32mScreen captured to ${resolved}\x1b[0m`, timestamp: Date.now() },
          ]);
        } else {
          addLines([
            { id: `adb-out-${Date.now()}`, type: 'output', text: `adb: command '${sub}' executed successfully.`, timestamp: Date.now() },
          ]);
        }
        break;
      }

      case 'node':
      case 'js': {
        if (!args[0]) {
          updateSession((s) => ({ ...s, replMode: 'node' }));
          addLines([
            {
              id: `node-${Date.now()}`,
              type: 'info',
              text: '\x1b[32;1mWelcome to Node.js v20.11.0 (Android aarch64).\x1b[0m\nType ".help" for more information or ".exit" to return to bash.',
              timestamp: Date.now(),
            },
          ]);
          break;
        }

        let codeToRun = '';
        if (args[0] === '-e') {
          codeToRun = args.slice(1).join(' ').replace(/^["']|["']$/g, '');
        } else {
          const resolved = globalVFS.resolvePath(activeSession.cwd, args[0]);
          const file = globalVFS.readFile(resolved);
          if (!file) throw new Error(`node: cannot find module '${args[0]}'`);
          codeToRun = file.content;
        }

        // Run JavaScript safely in browser context, capturing logs
        const logs: string[] = [];
        const customConsole = {
          log: (...vals: any[]) => logs.push(vals.map((v) => (typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v))).join(' ')),
          error: (...vals: any[]) => logs.push(`\x1b[31;1mError: ${vals.join(' ')}\x1b[0m`),
          warn: (...vals: any[]) => logs.push(`\x1b[33mWarn: ${vals.join(' ')}\x1b[0m`),
          info: (...vals: any[]) => logs.push(`\x1b[36m${vals.join(' ')}\x1b[0m`),
        };

        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function('console', codeToRun);
          fn(customConsole);
          const output = logs.join('\n') || '\x1b[32m[Program exited with code 0]\x1b[0m';
          addLines([{ id: `js-out-${Date.now()}`, type: 'output', text: output, timestamp: Date.now() }]);
        } catch (e: any) {
          const errOutput = `${logs.join('\n') ? logs.join('\n') + '\n' : ''}\x1b[31;1m${e.name}: ${e.message}\x1b[0m\n\x1b[33mTip: Run "debug ${args[0]}" or "jdb ${args[0]}" to debug this error!\x1b[0m`;
          addLines([{ id: `js-err-${Date.now()}`, type: 'error', text: errOutput, timestamp: Date.now() }]);
        }
        break;
      }

      case 'python':
      case 'python3': {
        if (!args[0]) {
          updateSession((s) => ({ ...s, replMode: 'python' }));
          addLines([
            {
              id: `py-${Date.now()}`,
              type: 'info',
              text: '\x1b[33;1mPython 3.12.2 (main, Android Termux Linux aarch64)\x1b[0m\nType "help", "copyright", "credits" or "license" for more information.\nUse exit() or quit() to return to bash.',
              timestamp: Date.now(),
            },
          ]);
          break;
        }
        const resolved = globalVFS.resolvePath(activeSession.cwd, args[0]);
        const file = globalVFS.readFile(resolved);
        if (!file) throw new Error(`python: can't open file '${args[0]}': [Errno 2] No such file or directory`);
        
        // Lightweight simulated python output
        addLines([
          { id: `py-out-${Date.now()}`, type: 'output', text: `[Python 3.12 executed ${args[0]}]\nOutput: Finished execution successfully without runtime exceptions.`, timestamp: Date.now() },
        ]);
        break;
      }

      case 'curl': {
        if (!args[0]) throw new Error('curl: try \'curl --help\' for more information');
        const url = args[0];
        addLines([{ id: `curl-wait-${Date.now()}`, type: 'info', text: `\x1b[36m[*] Fetching ${url}...\x1b[0m`, timestamp: Date.now() }]);
        try {
          const res = await fetch(url);
          const text = await res.text();
          addLines([{ id: `curl-res-${Date.now()}`, type: 'output', text: text.slice(0, 3000), timestamp: Date.now() }]);
        } catch (e: any) {
          throw new Error(`curl: (6) Could not resolve host or CORS blocked: ${e.message}`);
        }
        break;
      }

      case 'ai': {
        const query = args.join(' ');
        if (!query) {
          setShowAiModal(true);
          break;
        }

        addLines([
          { id: `ai-ask-${Date.now()}`, type: 'info', text: `\x1b[35m[*] Consulting Gemini 3.8 Flash...\x1b[0m`, timestamp: Date.now() },
        ]);

        const res = await fetch('/api/terminal/ai-shell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: query,
            cwd: activeSession.cwd,
            os: 'Android 15 (Linux 6.1 aarch64)',
          }),
        });

        const data = await res.json();
        if (data.success) {
          addLines([
            { id: `ai-ans-${Date.now()}`, type: 'output', text: `\x1b[36;1m[Gemini Assistant]:\x1b[0m\n${data.answer}`, timestamp: Date.now() },
          ]);
        } else {
          throw new Error(data.error || 'Failed to get AI response');
        }
        break;
      }

      default:
        throw new Error(`${cmd}: command not found. Type 'help' for available commands.`);
    }
  };

  return {
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
  };
}

export function getPromptPrefix(
  cwd: string,
  user: string = 'u0_a245',
  style: 'termux' | 'root' | 'ubuntu' = 'termux',
  replMode: 'none' | 'node' | 'python' = 'none'
): string {
  if (replMode === 'node') {
    return '\x1b[32;1m>\x1b[0m ';
  }
  if (replMode === 'python') {
    return '\x1b[33;1m>>>\x1b[0m ';
  }

  const shortCwd = cwd === '/home/user' ? '~' : cwd.startsWith('/home/user/') ? '~' + cwd.slice(10) : cwd;

  if (style === 'root' || user === 'root') {
    return `\x1b[31;1mroot@generic_x86_64\x1b[0m:\x1b[34;1m${shortCwd}\x1b[0m\x1b[31;1m#\x1b[0m `;
  }

  if (style === 'ubuntu') {
    return `\x1b[32;1muser@andro-desktop\x1b[0m:\x1b[34;1m${shortCwd}\x1b[0m$ `;
  }

  // Android Termux default
  return `\x1b[32;1m${user}@localhost\x1b[0m \x1b[33;1m${shortCwd}\x1b[0m \x1b[35m$\x1b[0m `;
}

