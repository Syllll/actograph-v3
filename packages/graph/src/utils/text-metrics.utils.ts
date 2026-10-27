let measureCanvas: HTMLCanvasElement | null = null;

/** Text metrics shared by axis layout and descriptors, in screen pixels. */
export function measureAxisTextWidth(text: string, fontSize: number, fontFamily: string,
  fontStyle?: string): number {
  if (typeof document === 'undefined') return text.length * fontSize * 0.6;
  measureCanvas ??= document.createElement('canvas');
  const context = measureCanvas.getContext('2d');
  if (!context) return text.length * fontSize * 0.6;
  context.font = `${fontStyle ? `${fontStyle} ` : ''}${fontSize}px ${fontFamily}`;
  return context.measureText(text).width;
}
