import { createErrorScreenshotDataUrl, createReceiptOcrSampleDataUrl } from './sampleImages';

export interface VFSNode {
  name: string;
  path: string;
  isDir: boolean;
  content?: string; // string or base64 data URI
  size: number;
  updatedAt: string;
  mimeType?: string;
  permissions: string;
  children?: { [key: string]: VFSNode };
}

const STORAGE_KEY = 'androterm_vfs_v2';

export function getInitialVFS(): VFSNode {
  const errorImg = typeof window !== 'undefined' ? createErrorScreenshotDataUrl() : '';
  const receiptImg = typeof window !== 'undefined' ? createReceiptOcrSampleDataUrl() : '';

  return {
    name: '',
    path: '/',
    isDir: true,
    size: 4096,
    updatedAt: new Date().toISOString(),
    permissions: 'drwxr-xr-x',
    children: {
      bin: {
        name: 'bin',
        path: '/bin',
        isDir: true,
        size: 4096,
        updatedAt: new Date().toISOString(),
        permissions: 'drwxr-xr-x',
        children: {},
      },
      etc: {
        name: 'etc',
        path: '/etc',
        isDir: true,
        size: 4096,
        updatedAt: new Date().toISOString(),
        permissions: 'drwxr-xr-x',
        children: {
          'os-release': {
            name: 'os-release',
            path: '/etc/os-release',
            isDir: false,
            size: 142,
            updatedAt: new Date().toISOString(),
            permissions: '-rw-r--r--',
            content: `NAME="AndroTerm Pro OS"
VERSION="15 (Vanilla Ice Cream)"
ID="android"
ID_LIKE="linux"
VERSION_CODENAME="vic"
PRETTY_NAME="Android 15 (Linux 6.1 aarch64)"
HOME_URL="https://androterm.dev"
ARCH="aarch64"`,
          },
          hosts: {
            name: 'hosts',
            path: '/etc/hosts',
            isDir: false,
            size: 64,
            updatedAt: new Date().toISOString(),
            permissions: '-rw-r--r--',
            content: `127.0.0.1       localhost\n::1             localhost ip6-localhost\n192.168.1.105   android-phone`,
          },
        },
      },
      sdcard: {
        name: 'sdcard',
        path: '/sdcard',
        isDir: true,
        size: 4096,
        updatedAt: new Date().toISOString(),
        permissions: 'drwxrwxr-x',
        children: {
          DCIM: {
            name: 'DCIM',
            path: '/sdcard/DCIM',
            isDir: true,
            size: 4096,
            updatedAt: new Date().toISOString(),
            permissions: 'drwxrwxr-x',
            children: {
              Screenshots: {
                name: 'Screenshots',
                path: '/sdcard/DCIM/Screenshots',
                isDir: true,
                size: 4096,
                updatedAt: new Date().toISOString(),
                permissions: 'drwxrwxr-x',
                children: {
                  'error_stacktrace.png': {
                    name: 'error_stacktrace.png',
                    path: '/sdcard/DCIM/Screenshots/error_stacktrace.png',
                    isDir: false,
                    size: errorImg.length,
                    updatedAt: new Date().toISOString(),
                    permissions: '-rw-rw-r--',
                    mimeType: 'image/png',
                    content: errorImg,
                  },
                },
              },
              'receipt_ocr_sample.png': {
                name: 'receipt_ocr_sample.png',
                path: '/sdcard/DCIM/receipt_ocr_sample.png',
                isDir: false,
                size: receiptImg.length,
                updatedAt: new Date().toISOString(),
                permissions: '-rw-rw-r--',
                mimeType: 'image/png',
                content: receiptImg,
              },
            },
          },
          Download: {
            name: 'Download',
            path: '/sdcard/Download',
            isDir: true,
            size: 4096,
            updatedAt: new Date().toISOString(),
            permissions: 'drwxrwxr-x',
            children: {
              'notes.txt': {
                name: 'notes.txt',
                path: '/sdcard/Download/notes.txt',
                isDir: false,
                size: 210,
                updatedAt: new Date().toISOString(),
                permissions: '-rw-rw-r--',
                content: `Android Dev Notes:
1. Run "ocr /sdcard/DCIM/receipt_ocr_sample.png" to extract receipt text!
2. Run "debug /sdcard/DCIM/Screenshots/error_stacktrace.png" to debug Android NPE crash.
3. Use "camera" command to snap live photo from phone camera!`,
              },
            },
          },
        },
      },
      home: {
        name: 'home',
        path: '/home',
        isDir: true,
        size: 4096,
        updatedAt: new Date().toISOString(),
        permissions: 'drwxr-xr-x',
        children: {
          user: {
            name: 'user',
            path: '/home/user',
            isDir: true,
            size: 4096,
            updatedAt: new Date().toISOString(),
            permissions: 'drwx------',
            children: {
              'welcome.txt': {
                name: 'welcome.txt',
                path: '/home/user/welcome.txt',
                isDir: false,
                size: 780,
                updatedAt: new Date().toISOString(),
                permissions: '-rw-r--r--',
                content: `══════════════════════════════════════════════════════════════════
 ⚡ WELCOME TO ANDROTERM PRO - ANDROID & DESKTOP TERMINAL WORKSTATION
══════════════════════════════════════════════════════════════════

FEATURES & COMMANDS:
  📷 camera                     - Open device camera viewfinder & snap photos
  🖼️  imgview <file>             - Render high-res image & metadata in terminal
  🔍 ocr <file>                 - Extract all text, code & tables from image (Gemini 3.8)
  🐛 debug <file>               - AI visual bug & stacktrace debugger (image or script)
  📱 adb devices / logcat       - Android Debug Bridge command suite
  💻 node / python <file.js>    - Execute JS/Python scripts in sandbox
  📝 nano <file>                - Fullscreen terminal text editor
  📊 top                        - Realtime Android process monitor
  🚀 neofetch                   - System specs & Android ASCII art
  📁 ls, cd, cat, mkdir, rm     - Unix filesystem operations

SAMPLE FILES READY TO TEST:
  • ocr /sdcard/DCIM/receipt_ocr_sample.png
  • debug /sdcard/DCIM/Screenshots/error_stacktrace.png
  • debug projects/buggy_app.js
══════════════════════════════════════════════════════════════════`,
              },
              projects: {
                name: 'projects',
                path: '/home/user/projects',
                isDir: true,
                size: 4096,
                updatedAt: new Date().toISOString(),
                permissions: 'drwxr-xr-x',
                children: {
                  'buggy_app.js': {
                    name: 'buggy_app.js',
                    path: '/home/user/projects/buggy_app.js',
                    isDir: false,
                    size: 340,
                    updatedAt: new Date().toISOString(),
                    permissions: '-rw-r--r--',
                    content: `// Sample buggy JavaScript code
function calculateUserDiscount(user, cartTotal) {
  // BUG: user.membership is accessed directly without checking if user is defined or null
  const tier = user.membership.tier; 
  if (tier === 'VIP') {
    return cartTotal * 0.8;
  }
  return cartTotal;
}

// Running this will throw: TypeError: Cannot read properties of undefined (reading 'tier')
const result = calculateUserDiscount(null, 100);
console.log('Discounted Total:', result);`,
                  },
                },
              },
              scripts: {
                name: 'scripts',
                path: '/home/user/scripts',
                isDir: true,
                size: 4096,
                updatedAt: new Date().toISOString(),
                permissions: 'drwxr-xr-x',
                children: {
                  'monitor.sh': {
                    name: 'monitor.sh',
                    path: '/home/user/scripts/monitor.sh',
                    isDir: false,
                    size: 195,
                    updatedAt: new Date().toISOString(),
                    permissions: '-rwxr-xr-x',
                    content: `#!/bin/bash
echo "[*] Checking battery level: 94% (Charging)"
echo "[*] Checking thermal status: Normal (34.2°C)"
echo "[*] SELinux Mode: Enforcing"
echo "[*] Android ADB Bridge: ACTIVE (1 device connected)"`,
                  },
                },
              },
            },
          },
        },
      },
      tmp: {
        name: 'tmp',
        path: '/tmp',
        isDir: true,
        size: 4096,
        updatedAt: new Date().toISOString(),
        permissions: 'drwxrwxrwt',
        children: {},
      },
    },
  };
}

export class VirtualFileSystem {
  private root: VFSNode;

  constructor() {
    this.root = this.loadFromStorage() || getInitialVFS();
  }

  private loadFromStorage(): VFSNode | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load VFS from localStorage:', e);
    }
    return null;
  }

  public saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.root));
    } catch (e) {
      console.warn('VFS storage quota warning:', e);
    }
  }

  public reset() {
    this.root = getInitialVFS();
    this.saveToStorage();
  }

  public resolvePath(currentDir: string, targetPath: string): string {
    if (!targetPath || targetPath === '.') return currentDir;
    if (targetPath === '~') return '/home/user';
    if (targetPath.startsWith('~/')) {
      targetPath = '/home/user' + targetPath.slice(1);
    }

    let absolute = targetPath.startsWith('/')
      ? targetPath
      : `${currentDir === '/' ? '' : currentDir}/${targetPath}`;

    const parts = absolute.split('/').filter(Boolean);
    const resolved: string[] = [];

    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }

    return '/' + resolved.join('/');
  }

  public getNode(path: string): VFSNode | null {
    if (path === '/' || path === '') return this.root;

    const parts = path.split('/').filter(Boolean);
    let current = this.root;

    for (const part of parts) {
      if (!current.isDir || !current.children || !current.children[part]) {
        return null;
      }
      current = current.children[part];
    }

    return current;
  }

  public listDirectory(path: string): VFSNode[] {
    const node = this.getNode(path);
    if (!node || !node.isDir || !node.children) return [];
    return Object.values(node.children);
  }

  public readFile(path: string): { content: string; mimeType?: string; size: number } | null {
    const node = this.getNode(path);
    if (!node || node.isDir || node.content === undefined) return null;
    return {
      content: node.content,
      mimeType: node.mimeType || 'text/plain',
      size: node.size,
    };
  }

  public writeFile(path: string, content: string, mimeType?: string): boolean {
    const lastSlash = path.lastIndexOf('/');
    const dirPath = lastSlash === 0 ? '/' : path.slice(0, lastSlash);
    const fileName = path.slice(lastSlash + 1);

    if (!fileName) return false;

    const dirNode = this.getNode(dirPath);
    if (!dirNode || !dirNode.isDir || !dirNode.children) return false;

    const existing = dirNode.children[fileName];
    const isImage = mimeType?.startsWith('image/') || content.startsWith('data:image/');

    dirNode.children[fileName] = {
      name: fileName,
      path: path,
      isDir: false,
      content,
      size: content.length,
      updatedAt: new Date().toISOString(),
      mimeType: mimeType || (isImage ? 'image/png' : 'text/plain'),
      permissions: existing ? existing.permissions : '-rw-r--r--',
    };

    this.saveToStorage();
    return true;
  }

  public createDirectory(path: string): boolean {
    const lastSlash = path.lastIndexOf('/');
    const dirPath = lastSlash === 0 ? '/' : path.slice(0, lastSlash);
    const dirName = path.slice(lastSlash + 1);

    if (!dirName) return false;

    const parentNode = this.getNode(dirPath);
    if (!parentNode || !parentNode.isDir || !parentNode.children) return false;

    if (parentNode.children[dirName]) return false; // Already exists

    parentNode.children[dirName] = {
      name: dirName,
      path: path,
      isDir: true,
      size: 4096,
      updatedAt: new Date().toISOString(),
      permissions: 'drwxr-xr-x',
      children: {},
    };

    this.saveToStorage();
    return true;
  }

  public removeNode(path: string): boolean {
    if (path === '/') return false; // Can't delete root
    const lastSlash = path.lastIndexOf('/');
    const parentPath = lastSlash === 0 ? '/' : path.slice(0, lastSlash);
    const name = path.slice(lastSlash + 1);

    const parentNode = this.getNode(parentPath);
    if (!parentNode || !parentNode.isDir || !parentNode.children || !parentNode.children[name]) {
      return false;
    }

    delete parentNode.children[name];
    this.saveToStorage();
    return true;
  }
}

export const globalVFS = new VirtualFileSystem();
