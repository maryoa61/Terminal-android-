import React from 'react';

// Converts ANSI color escape sequences or basic terminal markup into React elements
export function parseAnsiToReact(rawText: string): React.ReactNode[] {
  if (!rawText) return [];

  // Split lines
  const lines = rawText.split('\n');

  return lines.map((line, lineIdx) => {
    // Check if line is empty
    if (!line) {
      return React.createElement('div', { key: `l-${lineIdx}`, className: 'min-h-[1.25em]' }, '\u00A0');
    }

    // Parse ANSI codes
    const segments: React.ReactNode[] = [];
    const ansiRegex = /\x1b\[([0-9;]+)m/g;
    let lastIndex = 0;
    let currentStyle: React.CSSProperties = {};
    let currentClassNames: string[] = [];
    let match;

    while ((match = ansiRegex.exec(line)) !== null) {
      const textPart = line.substring(lastIndex, match.index);
      if (textPart) {
        segments.push(
          React.createElement(
            'span',
            {
              key: `seg-${lineIdx}-${lastIndex}`,
              className: currentClassNames.join(' '),
              style: { ...currentStyle },
            },
            textPart
          )
        );
      }

      const codes = match[1].split(';').map(Number);
      codes.forEach((code) => {
        if (code === 0) {
          currentStyle = {};
          currentClassNames = [];
        } else if (code === 1) {
          currentClassNames.push('font-bold');
        } else if (code === 2) {
          currentClassNames.push('opacity-70');
        } else if (code === 3) {
          currentClassNames.push('italic');
        } else if (code === 4) {
          currentClassNames.push('underline');
        } else if (code >= 30 && code <= 37) {
          const colorMap: Record<number, string> = {
            30: 'text-zinc-500',
            31: 'text-red-400',
            32: 'text-emerald-400',
            33: 'text-amber-400',
            34: 'text-sky-400',
            35: 'text-purple-400',
            36: 'text-cyan-400',
            37: 'text-zinc-200',
          };
          currentClassNames.push(colorMap[code]);
        } else if (code >= 90 && code <= 97) {
          const brightMap: Record<number, string> = {
            90: 'text-zinc-400',
            91: 'text-rose-400',
            92: 'text-green-300',
            93: 'text-yellow-300',
            94: 'text-blue-300',
            95: 'text-fuchsia-300',
            96: 'text-teal-300',
            97: 'text-white font-semibold',
          };
          currentClassNames.push(brightMap[code]);
        }
      });

      lastIndex = ansiRegex.lastIndex;
    }

    const remaining = line.substring(lastIndex);
    if (remaining) {
      segments.push(
        React.createElement(
          'span',
          {
            key: `seg-${lineIdx}-${lastIndex}`,
            className: currentClassNames.join(' '),
            style: { ...currentStyle },
          },
          remaining
        )
      );
    }

    return React.createElement(
      'div',
      {
        key: `line-${lineIdx}`,
        className: 'whitespace-pre-wrap break-all leading-relaxed',
      },
      segments.length > 0 ? segments : line
    );
  });
}
