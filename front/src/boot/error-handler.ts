import { boot } from 'quasar/wrappers';
import { Dialog } from 'quasar';
import ErrorReportDialog from 'src/components/ErrorReportDialog.vue';
import { getCurrentObservationSummary } from 'src/composables/use-observation';
import {
  buildErrorReport,
  getErrorFingerprint,
  normalizeError,
  type ErrorReportType,
} from 'src/utils/error-report';

const DEDUP_MS = 5000;
const DIALOG_COOLDOWN_MS = 1000;
const DIALOG_OPEN_SAFETY_MS = 120000;

let dialogOpen = false;
let dialogOpenSafetyTimer: ReturnType<typeof setTimeout> | null = null;
let lastDialogShownAt = 0;
let pendingReport: string | null = null;
let pendingFingerprint: string | null = null;
const recentFingerprints = new Map<string, number>();

function clearDialogOpenSafetyTimer(): void {
  if (dialogOpenSafetyTimer != null) {
    clearTimeout(dialogOpenSafetyTimer);
    dialogOpenSafetyTimer = null;
  }
}

function getChronicleLabel(): string {
  try {
    return getCurrentObservationSummary();
  } catch {
    return 'n/a';
  }
}

function shouldShowDialog(fingerprint: string): boolean {
  if (dialogOpen) return false;

  const now = Date.now();
  if (now - lastDialogShownAt < DIALOG_COOLDOWN_MS) {
    return false;
  }

  const lastShown = recentFingerprints.get(fingerprint);
  if (lastShown != null && now - lastShown < DEDUP_MS) {
    return false;
  }

  return true;
}

function flushPendingReport(): void {
  try {
    const r = pendingReport;
    const fp = pendingFingerprint;
    pendingReport = null;
    pendingFingerprint = null;
    if (r != null && fp != null && shouldShowDialog(fp)) {
      showErrorDialog(r, fp);
    }
  } catch {
    // ignore
  }
}

function logRendererError(
  report: string,
  message: string,
  stack: string,
  type: ErrorReportType,
): void {
  try {
    if (window.api?.logRendererError) {
      void window.api.logRendererError({ report, message, stack, type }).catch(() => {
        // ignore IPC failures
      });
    }
  } catch {
    // ignore
  }
}

function showErrorDialog(report: string, fingerprint: string): void {
  if (dialogOpen) return;

  dialogOpen = true;
  try {
    const chain = Dialog.create({
      component: ErrorReportDialog,
      componentProps: { reportText: report },
    });
    if (chain && typeof chain.onDismiss === 'function') {
      dialogOpenSafetyTimer = setTimeout(() => {
        dialogOpenSafetyTimer = null;
        if (dialogOpen) {
          dialogOpen = false;
          flushPendingReport();
        }
      }, DIALOG_OPEN_SAFETY_MS);
      chain.onDismiss(() => {
        clearDialogOpenSafetyTimer();
        dialogOpen = false;
        flushPendingReport();
      });
    } else {
      dialogOpen = false;
      flushPendingReport();
    }
    const now = Date.now();
    lastDialogShownAt = now;
    recentFingerprints.set(fingerprint, now);
    for (const [key, ts] of recentFingerprints) {
      if (now - ts > DEDUP_MS) {
        recentFingerprints.delete(key);
      }
    }
  } catch {
    clearDialogOpenSafetyTimer();
    dialogOpen = false;
  }
}

function handleReportedError(
  type: ErrorReportType,
  message: string,
  stack: string,
  vueInfo?: string,
): void {
  try {
    const fingerprint = getErrorFingerprint(message, stack);

    const report = buildErrorReport({
      type,
      message,
      stack,
      chronicle: getChronicleLabel(),
      vueInfo,
    });

    try {
      console.error('[ActoGraph]', type, message, report);
    } catch {
      // ignore
    }

    logRendererError(report, message, stack, type);

    if (shouldShowDialog(fingerprint)) {
      showErrorDialog(report, fingerprint);
    } else if (dialogOpen) {
      pendingReport = report;
      pendingFingerprint = fingerprint;
    }
  } catch {
    // never throw from handler
  }
}

export default boot(({ app }) => {
  app.config.errorHandler = (err, _instance, info) => {
    try {
      const { message, stack } = normalizeError(err);
      handleReportedError('VueError', message, stack, info);
    } catch {
      // ignore
    }
  };

  window.onerror = (message, _source, _lineno, _colno, error) => {
    try {
      const msg = typeof message === 'string' ? message : String(message);
      const stack = error ? normalizeError(error).stack : '';
      handleReportedError('window.onerror', msg, stack);
    } catch {
      // ignore
    }
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const { message, stack } = normalizeError(event.reason);
      handleReportedError('unhandledrejection', message, stack);
    } catch {
      // ignore
    }
  });
});
