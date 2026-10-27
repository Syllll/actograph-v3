const STORAGE_KEY = 'actograph.graph-export-preferences.v1';

export function readPngTransparentBackground(): boolean {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').pngTransparentBackground === true;
  } catch {
    return false;
  }
}

export function persistPngTransparentBackground(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pngTransparentBackground: value }));
  } catch {
    // Export remains available when browser storage is unavailable.
  }
}

/** Fill only the global canvas background, keeping semantic fills untouched. */
export function prepareGraphExportCanvas(canvas: HTMLCanvasElement, transparent: boolean): CanvasRenderingContext2D | null {
  const context = canvas.getContext('2d');
  if (context && !transparent) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  return context;
}
