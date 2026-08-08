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
 * Builds a semi-crosshair: dashed stubs toward the bottom and left axes only
 * (cursor → bottom Y-axis tick line, cursor → left X-axis tick line).
 */
export function computeCrosshairSegments(
  cursorX: number,
  cursorY: number,
  bounds: IPlotBounds,
): ICrosshairSegments {
  return {
    vertical: {
      x1: cursorX,
      y1: cursorY,
      x2: cursorX,
      y2: bounds.bottomY,
    },
    horizontal: {
      x1: cursorX,
      y1: cursorY,
      x2: bounds.leftX,
      y2: cursorY,
    },
  };
}

/**
 * Positions the hover time label inside the plot so it does not cover X-axis tick labels.
 */
export function computeHoverTimeLabelPosition(
  cursorX: number,
  cursorY: number,
  labelWidth: number,
  labelHeight: number,
  bounds: IPlotBounds,
  gap = 8,
): { x: number; y: number } {
  let x = cursorX - labelWidth / 2;
  let y = cursorY - labelHeight - gap;

  if (y < bounds.topY) {
    y = cursorY + gap;
  }

  x = Math.max(bounds.leftX, Math.min(bounds.rightX - labelWidth, x));
  y = Math.max(bounds.topY, Math.min(bounds.bottomY - labelHeight, y));

  return { x, y };
}
