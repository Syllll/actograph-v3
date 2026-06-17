import { onMounted, onUnmounted } from 'vue';

const RESUME_EVENT = 'actograph:resume';
const CHARTS_REFRESH_EVENT = 'actograph:charts-refresh';
const RESUME_EMIT_DEBOUNCE_MS = 500;

let initialized = false;
let resumeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let resumeInFlight: Promise<void> | null = null;
let lastResumeEmitAt = 0;

function emitAppResume(): void {
  const now = Date.now();
  if (now - lastResumeEmitAt < RESUME_EMIT_DEBOUNCE_MS) {
    return;
  }
  lastResumeEmitAt = now;
  window.dispatchEvent(new CustomEvent(RESUME_EVENT));
}

/**
 * Register a callback invoked when the app resumes (visibility, system wake, backend restart).
 * Returns an unsubscribe function.
 */
export function onAppResume(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(RESUME_EVENT, handler);
  return () => window.removeEventListener(RESUME_EVENT, handler);
}

/**
 * Notify chart components to refresh when their tab becomes active.
 */
export function emitChartsRefresh(): void {
  window.dispatchEvent(new CustomEvent(CHARTS_REFRESH_EVENT));
}

export function onChartsRefresh(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(CHARTS_REFRESH_EVENT, handler);
  return () => window.removeEventListener(CHARTS_REFRESH_EVENT, handler);
}

/**
 * Subscribe to app resume events for the lifetime of a component.
 */
export function useAppResume(callback: () => void): void {
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    unsubscribe = onAppResume(callback);
  });

  onUnmounted(() => {
    unsubscribe?.();
  });
}

async function ensureElectronBackend(): Promise<boolean> {
  if (process.env.MODE !== 'electron' || !process.env.PROD || !window.api) {
    return true;
  }

  try {
    const result = (await window.api.invoke('ensure-backend')) as { ok?: boolean };
    return result?.ok !== false;
  } catch (error) {
    console.warn('[app-resume] ensure-backend failed:', error);
    return false;
  }
}

async function handleAppResume(): Promise<void> {
  const backendOk = await ensureElectronBackend();
  if (backendOk) {
    emitAppResume();
  }
}

function scheduleAppResume(): void {
  if (resumeDebounceTimer) {
    clearTimeout(resumeDebounceTimer);
  }
  resumeDebounceTimer = setTimeout(() => {
    resumeDebounceTimer = null;
    if (!resumeInFlight) {
      resumeInFlight = handleAppResume().finally(() => {
        resumeInFlight = null;
      });
    }
  }, 250);
}

/**
 * Global listeners for visibility changes and Electron power/resume events.
 * Call once during app bootstrap.
 */
export function initAppResume(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      scheduleAppResume();
    }
  });

  if (process.env.MODE === 'electron' && window.api) {
    window.api.on('app-resume', () => {
      scheduleAppResume();
    });

    // Refresh UI when the main process recovers the API without a visibility change.
    window.api.on('server-status', (data: { status?: string }) => {
      if (data?.status === 'backend-ready') {
        emitAppResume();
      }
    });
  }
}
