// Generates realistic error screenshot images as Data URLs for immediate testing

export function createErrorScreenshotDataUrl(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Dark terminal/IDE background
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Window titlebar
  ctx.fillStyle = '#181825';
  ctx.fillRect(0, 0, canvas.width, 36);

  // Window buttons
  ctx.fillStyle = '#f38ba8';
  ctx.beginPath();
  ctx.arc(20, 18, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f9e2af';
  ctx.beginPath();
  ctx.arc(38, 18, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a6e3a1';
  ctx.beginPath();
  ctx.arc(56, 18, 6, 0, Math.PI * 2);
  ctx.fill();

  // Title text
  ctx.fillStyle = '#cdd6f4';
  ctx.font = '13px monospace';
  ctx.fillText('Android Studio / Termux Crash Dump - Logcat', 280, 23);

  // Content text - realistic Android / JS stack trace
  const lines = [
    { text: '09-29 22:14:02.193  3124  3124 E AndroidRuntime: FATAL EXCEPTION: main', color: '#f38ba8', bold: true },
    { text: 'Process: com.androterm.app, PID: 3124', color: '#f38ba8', bold: false },
    { text: 'java.lang.NullPointerException: Attempt to invoke virtual method', color: '#f38ba8', bold: true },
    { text: "   'int java.lang.String.length()' on a null object reference", color: '#f38ba8', bold: true },
    { text: '    at com.androterm.app.TerminalSession.executeCommand(TerminalSession.kt:142)', color: '#fab387', bold: false },
    { text: '    at com.androterm.app.TerminalSession.dispatchInput(TerminalSession.kt:88)', color: '#fab387', bold: false },
    { text: '    at com.androterm.app.ui.TerminalView$onKeyDown$1.invoke(TerminalView.kt:215)', color: '#fab387', bold: false },
    { text: '    at android.view.View.dispatchKeyEvent(View.java:15210)', color: '#a6adc8', bold: false },
    { text: '    at android.view.ViewGroup.dispatchKeyEvent(ViewGroup.java:2140)', color: '#a6adc8', bold: false },
    { text: '----------------------------------------------------------------------------------', color: '#585b70', bold: false },
    { text: '// Offending code snippet in TerminalSession.kt (Line 140-144):', color: '#89b4fa', bold: false },
    { text: '140  fun executeCommand(rawInput: String?) {', color: '#cdd6f4', bold: false },
    { text: '141      val trimmed = rawInput.trim() // BUG: rawInput is nullable, causes NPE if null!', color: '#f38ba8', bold: true },
    { text: '142      if (trimmed.length > 0) {', color: '#f38ba8', bold: false },
    { text: '143          shellEngine.run(trimmed)', color: '#cdd6f4', bold: false },
    { text: '144      }', color: '#cdd6f4', bold: false },
    { text: '145  }', color: '#cdd6f4', bold: false },
  ];

  let y = 70;
  lines.forEach((line) => {
    ctx.font = line.bold ? 'bold 15px monospace' : '15px monospace';
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, 24, y);
    y += 24;
  });

  return canvas.toDataURL('image/png');
}

export function createReceiptOcrSampleDataUrl(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('ANDRO-TECH HARDWARE LABS - RECEIPT & LOG', 60, 45);

  ctx.font = '14px monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText('INVOICE #: AT-2026-98124', 60, 80);
  ctx.fillText('DEVICE: Google Pixel 9 Pro Fold (Tensor G4)', 60, 105);
  ctx.fillText('OPERATING SYSTEM: Android 15 Vanilla Ice Cream', 60, 130);
  ctx.fillText('KERNEL: Linux 6.1.75-android15-11-g8812c3f', 60, 155);

  ctx.fillText('------------------------------------------------------------', 60, 185);
  ctx.fillText('ITEM                           QTY    UNIT       TOTAL', 60, 210);
  ctx.fillText('------------------------------------------------------------', 60, 230);
  ctx.fillText('USB-C Serial Debug Cable       2      $14.50     $29.00', 60, 255);
  ctx.fillText('Android Termux Pro Dev License 1      $19.99     $19.99', 60, 280);
  ctx.fillText('ARM64 Cortex-A720 Co-Processor 1      $85.00     $85.00', 60, 305);
  ctx.fillText('------------------------------------------------------------', 60, 335);
  ctx.font = 'bold 15px monospace';
  ctx.fillText('TOTAL DUE: $133.99 USD', 60, 365);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('STATUS: VERIFIED & TESTED | AUTH_HASH: 0x9f18a42b10', 60, 410);
  ctx.fillText('BARCODE ID: *ANDRO-9092F873-B496*', 60, 435);

  return canvas.toDataURL('image/png');
}
