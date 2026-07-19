export type ErrorReportType = 'VueError' | 'window.onerror' | 'unhandledrejection';

export function truncateStack(stack: string, maxLines = 30): string {
  if (!stack) return '';
  return stack.split('\n').slice(0, maxLines).join('\n');
}

export function normalizeErrorMessage(message: string): string {
  let normalized = message.trim();
  if (normalized.startsWith('Uncaught ')) {
    normalized = normalized.slice('Uncaught '.length);
  }
  normalized = normalized.replace(/^(?:\w+Error|Error):\s*/, '');
  return normalized.trim();
}

export function getStackFingerprintLines(stack: string, maxLines = 3): string {
  if (!stack) return '';
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join('\n');
}

export function getErrorFingerprint(message: string, stack: string): string {
  const normalizedMessage = normalizeErrorMessage(message);
  const stackFingerprint = getStackFingerprintLines(stack, 3);
  return `${normalizedMessage}\0${stackFingerprint}`;
}

export function normalizeError(value: unknown): { message: string; stack: string } {
  if (value instanceof Error) {
    return {
      message: value.message || String(value),
      stack: value.stack || '',
    };
  }
  if (typeof value === 'string') {
    return { message: value, stack: '' };
  }
  try {
    return { message: String(value), stack: '' };
  } catch {
    return { message: 'Unknown error', stack: '' };
  }
}

export function getPlatformLabel(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  if (navigator.platform) return navigator.platform;
  const ua = navigator.userAgent || '';
  return ua.length > 80 ? `${ua.slice(0, 80)}...` : ua;
}

export function formatRouteLabel(pathname: string, search: string, hash: string): string {
  if (hash) return hash;
  return `${pathname}${search}${hash}`;
}

export function getRouteLabel(): string {
  if (typeof window === 'undefined') return 'n/a';
  const { pathname, search, hash } = window.location;
  return formatRouteLabel(pathname, search, hash);
}

export function buildErrorReport(params: {
  type: ErrorReportType;
  message: string;
  stack: string;
  chronicle?: string;
  date?: string;
  version?: string;
  platform?: string;
  route?: string;
  vueInfo?: string;
}): string {
  const {
    type,
    message,
    stack,
    chronicle = 'n/a',
    date = new Date().toISOString(),
    version = process.env.APP_VERSION ?? 'unknown',
    platform = getPlatformLabel(),
    route = getRouteLabel(),
    vueInfo,
  } = params;

  const displayMessage = vueInfo ? `${message} (${vueInfo})` : message;
  const truncatedStack = truncateStack(stack);
  const stackBlock = truncatedStack
    ? truncatedStack
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')
    : '  (aucune)';

  return [
    '--- Rapport ActoGraph ---',
    `Date: ${date}`,
    `Version: ${version}`,
    `Plateforme: ${platform}`,
    `Route: ${route}`,
    `Chronique: ${chronicle}`,
    `Type: ${type}`,
    `Message: ${displayMessage}`,
    'Stack:',
    stackBlock,
    '-------------------------',
  ].join('\n');
}
