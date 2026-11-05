// v1.04: send renderer errors to the main process log file (%APPDATA%\DataFall\logs\main.log),
// so "the game crashed" reports can be diagnosed. No-op in a normal browser.
type DfBridge = { logError?: (text: string) => void; openLogsFolder?: () => void };

function bridge(): DfBridge | undefined {
  return (window as unknown as { df?: DfBridge }).df;
}

let sent = 0;
const MAX_REPORTS_PER_SESSION = 200; // a render loop error must not flood the log

export function logRendererError(context: string, error: unknown, extra?: string) {
  try {
    if (sent >= MAX_REPORTS_PER_SESSION) return;
    sent++;
    const err = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
    bridge()?.logError?.(`[${context}] ${err}${extra ? `\n${extra}` : ''}`);
  } catch {
    // logging must never throw
  }
}

export function canOpenLogsFolder() {
  return typeof bridge()?.openLogsFolder === 'function';
}

export function openLogsFolder() {
  try {
    bridge()?.openLogsFolder?.();
  } catch {
    // ignore
  }
}

export function installGlobalErrorLogging() {
  window.addEventListener('error', (event) => {
    logRendererError('window.error', event.error ?? event.message, event.filename ? `${event.filename}:${event.lineno}` : undefined);
  });
  window.addEventListener('unhandledrejection', (event) => {
    logRendererError('unhandledrejection', event.reason);
  });
}
