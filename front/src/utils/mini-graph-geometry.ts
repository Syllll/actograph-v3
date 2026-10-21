export interface MiniGraphRect { x: number; y: number; width: number; height: number }
export interface MiniGraphScreen { width: number; height: number }
const MARGIN = 8;
export const MINI_GRAPH_STORAGE_KEY = 'actograph.miniGraph.rect.v1';

export function clampMiniGraphRect(value: Partial<MiniGraphRect>, screen: MiniGraphScreen): MiniGraphRect {
  const availableW = Math.max(1, screen.width - 2 * MARGIN);
  const availableH = Math.max(1, screen.height - 2 * MARGIN);
  const finite = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const width = Math.min(availableW, Math.max(Math.min(340, availableW), finite(value.width, 640)));
  const height = Math.min(availableH, Math.max(Math.min(220, availableH), finite(value.height, 340)));
  return {
    width, height,
    x: Math.max(MARGIN, Math.min(screen.width - width - MARGIN, finite(value.x, screen.width - width - 24))),
    y: Math.max(MARGIN, Math.min(screen.height - height - MARGIN, finite(value.y, screen.height - height - 24))),
  };
}

export function readMiniGraphRect(screen: MiniGraphScreen): MiniGraphRect {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(MINI_GRAPH_STORAGE_KEY) ?? 'null');
    return clampMiniGraphRect(parsed && typeof parsed === 'object' ? parsed : {}, screen);
  } catch {
    return clampMiniGraphRect({}, screen);
  }
}

export function saveMiniGraphRect(rect: MiniGraphRect): void {
  try { localStorage.setItem(MINI_GRAPH_STORAGE_KEY, JSON.stringify(rect)); } catch { /* Storage is optional. */ }
}
