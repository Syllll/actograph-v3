export interface IPlotBounds {
  leftX: number;
  rightX: number;
  topY: number;
  bottomY: number;
}

export interface ICrosshairSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ICrosshairSegments {
  vertical: ICrosshairSegment;
  horizontal: ICrosshairSegment;
}

/**
 * Builds full-span crosshair segments that reach both axes of the plot area.
 */
export function computeCrosshairSegments(
  cursorX: number,
  cursorY: number,
  bounds: IPlotBounds,
): ICrosshairSegments {
  return {
    vertical: {
      x1: cursorX,
      y1: bounds.topY,
      x2: cursorX,
      y2: bounds.bottomY,
    },
    horizontal: {
      x1: bounds.leftX,
      y1: cursorY,
      x2: bounds.rightX,
      y2: cursorY,
    },
  };
}
