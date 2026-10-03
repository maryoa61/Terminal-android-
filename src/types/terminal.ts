export type ThemeName = 'termux' | 'dracula' | 'cyberpunk' | 'nord' | 'monokai' | 'amber' | 'matrix';

export interface TerminalTheme {
  id: ThemeName;
  name: string;
  bg: string;
  fg: string;
  promptUser: string;
  promptHost: string;
  promptPath: string;
  promptSymbol: string;
  accent: string;
  selectionBg: string;
  cursorColor: string;
  border: string;
  windowBg: string;
  statusbarBg: string;
}

export interface FSFile {
  name: string;
  content: string; // text or base64 data:image/...
  isDir: boolean;
  size: number;
  updatedAt: string;
  mimeType?: string;
  permissions?: string;
}

export interface FSDirectory {
  [key: string]: FSFile | FSDirectory;
}

export type LineType = 
  | 'input'
  | 'output'
  | 'error'
  | 'success'
  | 'warning'
  | 'info'
  | 'image'
  | 'ocr-result'
  | 'debug-report'
  | 'raw-html';

export interface TerminalLine {
  id: string;
  type: LineType;
  text?: string;
  imageSrc?: string;
  imageAlt?: string;
  commandPrompt?: string;
  ocrText?: string;
  ocrLineCount?: number;
  debugReport?: string;
  debugOriginalTarget?: string;
  debugFixedCode?: string;
  timestamp: number;
}

export interface ProcessItem {
  pid: number;
  user: string;
  pr: number;
  ni: number;
  virt: string;
  res: string;
  shr: string;
  s: 'R' | 'S' | 'Z';
  cpu: number;
  mem: number;
  time: string;
  command: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  history: string[];
  historyIndex: number;
  lines: TerminalLine[];
  cwd: string;
  env: Record<string, string>;
  activeProcess?: string | null;
  replMode?: 'none' | 'node' | 'python';
}

export interface Breakpoint {
  id: number;
  line: number;
  file: string;
  enabled: boolean;
  hitCount: number;
  condition?: string;
}

export interface StackFrame {
  id: number;
  functionName: string;
  fileName: string;
  line: number;
  address: string;
}

export interface ScopeVariable {
  name: string;
  value: string;
  type: string;
  scope: 'local' | 'closure' | 'global' | 'watch';
}

export interface DebugThread {
  id: number;
  name: string;
  state: 'RUNNING' | 'SUSPENDED' | 'WAITING' | 'TERMINATED';
  currentPc: string;
}

export interface DebuggerState {
  targetFile: string;
  status: 'IDLE' | 'STOPPED' | 'RUNNING' | 'CRASHED' | 'TERMINATED';
  currentLine: number;
  breakpoints: Breakpoint[];
  callStack: StackFrame[];
  variables: Record<string, ScopeVariable>;
  threads: DebugThread[];
  outputLines: string[];
  prompt: string; // e.g. '(jdb) ' or '(gdb) '
  activeThreadId: number;
}

export type OcrMode = 'text' | 'code' | 'table' | 'log';

export interface OcrStudioResult {
  text: string;
  mode: OcrMode;
  detectedLang?: string;
  lineCount: number;
  tables?: Array<{ headers: string[]; rows: string[][] }>;
}
