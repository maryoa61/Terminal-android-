import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Allow large base64 image uploads from camera and screenshots
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to extract base64 data & mime type from Data URL or raw base64
function parseImageData(dataUriOrBase64: string): { mimeType: string; base64: string } {
  if (dataUriOrBase64.startsWith('data:')) {
    const match = dataUriOrBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], base64: match[2] };
    }
  }
  return { mimeType: 'image/png', base64: dataUriOrBase64 };
}

// OCR: Read text, code, tables, or logs from image
app.post('/api/terminal/ocr', async (req, res) => {
  try {
    const { image, prompt, mode } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image is required for OCR' });
    }

    const { mimeType, base64 } = parseImageData(image);

    let instruction = 'Extract all visible text, numbers, source code, terminal commands, or stack traces from this image verbatim. Preserve line breaks and indentation faithfully.';
    
    if (mode === 'code') {
      instruction = 'You are an optical code reader. Extract ONLY the programming source code or terminal commands visible in this image. Remove any camera artifacts, line numbers on the left margin, or watermarks. Detect the programming language (e.g. JavaScript, Python, Kotlin, Java, C, Bash) and return the clean, runnable code.';
    } else if (mode === 'table') {
      instruction = 'You are an optical table and invoice parser. Extract the tabular, receipt, or structured data from this image. Format it cleanly as a Markdown table or structured key-value list with aligned columns.';
    } else if (mode === 'log') {
      instruction = 'Extract logcat, stack traces, compiler errors, or terminal outputs from this image. Keep exact timestamps, log levels (E/W/I/D), line numbers, and error messages.';
    }

    if (prompt && prompt.trim()) {
      instruction += ` Specific instruction from user: ${prompt.trim()}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: instruction,
          },
        ],
      },
    });

    const extractedText = response.text || '';
    const lineCount = extractedText.split('\n').filter(Boolean).length;

    // Detect language if mode is code
    let detectedLang = 'text';
    if (mode === 'code' || extractedText.includes('function') || extractedText.includes('fun ') || extractedText.includes('def ')) {
      if (extractedText.includes('fun ') || extractedText.includes('val ') || extractedText.includes('var ') && extractedText.includes(': String')) {
        detectedLang = 'kotlin';
      } else if (extractedText.includes('def ') || extractedText.includes('import ') && extractedText.includes(':')) {
        detectedLang = 'python';
      } else if (extractedText.includes('const ') || extractedText.includes('let ') || extractedText.includes('console.log')) {
        detectedLang = 'javascript';
      } else if (extractedText.includes('#!/bin/bash') || extractedText.includes('echo ')) {
        detectedLang = 'bash';
      }
    }

    res.json({
      success: true,
      text: extractedText,
      lineCount,
      detectedLang,
      mode: mode || 'text',
    });
  } catch (err: any) {
    console.error('OCR Error:', err);
    res.status(500).json({
      error: err.message || 'Failed to process image OCR',
    });
  }
});

// Visual & Code Debugging: Debug screenshot of errors, stacktraces, or code files
app.post('/api/terminal/debug', async (req, res) => {
  try {
    const { image, code, errorText, context } = req.body;

    if (!image && !code && !errorText) {
      return res.status(400).json({ error: 'Must provide an image, code snippet, or error message to debug.' });
    }

    const parts: any[] = [];

    if (image) {
      const { mimeType, base64 } = parseImageData(image);
      parts.push({
        inlineData: {
          mimeType,
          data: base64,
        },
      });
    }

    const instruction = `
You are an expert Android, Linux, and Web Systems Engineer working inside an advanced developer terminal.
Analyze the provided screenshot, error log, or source code.
Identify the exact bug, root cause, and provide a clear, terminal-formatted diagnosis.

Format your output clearly with ANSI-style terminal headers:
[DIAGNOSIS REPORT]
• Summary: What went wrong in 1-2 sentences.
• Issue Detected: Exact error type, offending function or syntax anomaly.
• Root Cause: Why it happened.
• Resolution Steps: Bulleted steps to fix it.
• Corrected Code / Patch: Provide the full working code without errors.
• Suggested Shell Command: E.g., command to run, dependencies to install, or fix verification command.
Keep it strictly technical, direct, and actionable.
${context ? `Additional user context: ${context}` : ''}
${code ? `Code provided:\n\`\`\`\n${code}\n\`\`\`` : ''}
${errorText ? `Error output:\n${errorText}` : ''}
    `.trim();

    parts.push({ text: instruction });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
    });

    res.json({
      success: true,
      report: response.text || 'No diagnosis could be generated.',
    });
  } catch (err: any) {
    console.error('Debug Error:', err);
    res.status(500).json({
      error: err.message || 'Failed to debug code or image',
    });
  }
});

// Terminal AI Assistant: Natural language terminal helper
app.post('/api/terminal/ai-shell', async (req, res) => {
  try {
    const { prompt, cwd, os } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an Android Termux & Linux terminal command-line assistant.
The user is at current directory: "${cwd || '/home/user'}" on system "${os || 'Android 14 (Linux 6.1 aarch64)'}".
User asked: "${prompt}".
Respond concisely with the exact terminal command(s) or explanation.
Format commands cleanly so the user can easily understand and execute them. Avoid unnecessary fluff.`,
    });

    res.json({
      success: true,
      answer: response.text || '',
    });
  } catch (err: any) {
    console.error('AI Shell Error:', err);
    res.status(500).json({
      error: err.message || 'Failed to process AI shell command',
    });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AndroTerm Server', timestamp: new Date().toISOString() });
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AndroTerm] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
