import type { IPlotBounds } from './crosshair.utils';

/** Convertit un point world (global Pixi) vers coords locales d'un overlay screen-space. */
export function worldGlobalToOverlayLocal(
  global: { x: number; y: number },
  overlay: { toLocal(p: { x: number; y: number }): { x: number; y: number } },
): { x: number; y: number } {
  return overlay.toLocal(global);
}

export function computePlotBoundsInOverlay(args: {
  yAxisStart: { x: number; y: number };
  yAxisEnd: { x: number; y: number };
  xAxisEnd: { x: number; y: number };
  yAxisToGlobal: (p: { x: number; y: number }) => { x: number; y: number };
  xAxisToGlobal: (p: { x: number; y: number }) => { x: number; y: number };
  overlayToLocal: (p: { x: number; y: number }) => { x: number; y: number };
}): IPlotBounds | null {
  const { yAxisStart, yAxisEnd, xAxisEnd, yAxisToGlobal, xAxisToGlobal, overlayToLocal } = args;

  if (
    typeof xAxisEnd.x !== 'number' ||
    typeof xAxisEnd.y !== 'number'
  ) {
    return null;
  }

  const bottomLeft = overlayToLocal(yAxisToGlobal(yAxisStart));
  const topLeft = overlayToLocal(yAxisToGlobal(yAxisEnd));
  const bottomRight = overlayToLocal(xAxisToGlobal(xAxisEnd));

  return {
    leftX: bottomLeft.x,
    rightX: bottomRight.x,
    topY: topLeft.y,
    bottomY: bottomLeft.y,
  };
}
