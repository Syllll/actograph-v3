import type { IPlotBounds } from './crosshair.utils';

export interface IHoverOverlayState {
  interactive: boolean;
  suppressed: boolean;
}

/** Whether hover crosshair and dynamic time label should be rendered. */
export function shouldRenderHoverOverlay(state: IHoverOverlayState): boolean {
  return state.interactive && !state.suppressed;
}

/** True when (x, y) lies inside the plot rectangle (overlay local space). */
export function isPointInsidePlotBounds(
  x: number,
  y: number,
  bounds: IPlotBounds,
): boolean {
  return (
    x >= bounds.leftX &&
    x <= bounds.rightX &&
    y >= bounds.topY &&
    y <= bounds.bottomY
  );
}
