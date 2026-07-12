import type { IPeriod } from '@actograph/core';
import type { IGraphRenderOptions } from '../types/graph-render-options';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../types/graph-render-options';

export interface PauseOverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PauseOverlayBounds {
  leftX: number;
  rightX: number;
  topY: number;
  bottomY: number;
}

export interface PauseOverlayStyle {
  color: number;
  alpha: number;
}

export const DEFAULT_PAUSE_OVERLAY_STYLE: PauseOverlayStyle = {
  color: 0x888888,
  alpha: 0.45,
};

export function shouldDrawPauseOverlay(
  maskPauses: boolean | undefined = DEFAULT_GRAPH_RENDER_OPTIONS.maskPauses,
): boolean {
  return maskPauses !== false;
}

export function resolveMaskPausesOption(
  options?: Partial<IGraphRenderOptions>,
): boolean {
  return shouldDrawPauseOverlay(
    options?.maskPauses ?? DEFAULT_GRAPH_RENDER_OPTIONS.maskPauses,
  );
}

/**
 * Maps pause intervals to axis-aligned rectangles clipped to the data area.
 * Pure geometry: no PixiJS dependency (testable in isolation).
 */
export function computePauseOverlayRects(
  periods: IPeriod[],
  bounds: PauseOverlayBounds,
  getXFromDate: (date: Date) => number,
  options?: Partial<IGraphRenderOptions>,
): PauseOverlayRect[] {
  if (!resolveMaskPausesOption(options)) {
    return [];
  }

  const { leftX, rightX, topY, bottomY } = bounds;
  const zoneTopY = Math.min(topY, bottomY);
  const zoneHeight = Math.abs(bottomY - topY);
  if (zoneHeight <= 0 || rightX <= leftX) {
    return [];
  }

  const rects: PauseOverlayRect[] = [];

  for (const period of periods) {
    const rawStartX = getXFromDate(period.start);
    const rawEndX = getXFromDate(period.end);
    const startX = Math.max(leftX, Math.min(rawStartX, rawEndX));
    const endX = Math.min(rightX, Math.max(rawStartX, rawEndX));
    const width = endX - startX;

    if (width <= 0) {
      continue;
    }

    rects.push({
      x: startX,
      y: zoneTopY,
      width,
      height: zoneHeight,
    });
  }

  return rects;
}
