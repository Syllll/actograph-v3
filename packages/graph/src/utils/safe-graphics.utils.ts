export type SafeGraphics = {
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  rect(x: number, y: number, w: number, h: number): unknown;
  ellipse?(x: number, y: number, rx: number, ry: number): unknown;
  stroke?(style?: unknown): unknown;
  fill?(style?: unknown): unknown;
  setStrokeStyle?(style: unknown): unknown;
  setFillStyle?(style: unknown): unknown;
};

export function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n);
}

export function isFinitePoint(x: number, y: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y);
}

export function safeMoveTo(g: SafeGraphics, x: number, y: number): boolean {
  if (!isFinitePoint(x, y)) {
    return false;
  }
  g.moveTo(x, y);
  return true;
}

export function safeLineTo(g: SafeGraphics, x: number, y: number): boolean {
  if (!isFinitePoint(x, y)) {
    return false;
  }
  g.lineTo(x, y);
  return true;
}

export interface SafeRectOptions {
  fill?: unknown;
  stroke?: unknown;
}

export interface SafeEllipseOptions {
  fill?: unknown;
}

/**
 * Draws a rectangle when geometry is finite and width/height are positive.
 * Returns false on invalid geometry (no-op).
 */
export function safeRect(
  g: SafeGraphics,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: SafeRectOptions,
): boolean {
  if (
    !isFiniteNumber(x) ||
    !isFiniteNumber(y) ||
    !isFiniteNumber(w) ||
    !isFiniteNumber(h) ||
    w <= 0 ||
    h <= 0
  ) {
    return false;
  }

  g.rect(x, y, w, h);

  if (options?.fill !== undefined && g.fill) {
    g.fill(options.fill);
  }
  if (options?.stroke !== undefined && g.stroke) {
    g.stroke(options.stroke);
  }

  return true;
}

/**
 * Draws an ellipse when center and radii are finite and radii are positive.
 * Returns false on invalid geometry (no-op).
 */
export function safeEllipse(
  g: SafeGraphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  options?: SafeEllipseOptions,
): boolean {
  if (
    !isFinitePoint(x, y) ||
    !isFiniteNumber(rx) ||
    !isFiniteNumber(ry) ||
    rx <= 0 ||
    ry <= 0 ||
    !g.ellipse
  ) {
    return false;
  }

  g.ellipse(x, y, rx, ry);

  if (options?.fill !== undefined && g.fill) {
    g.fill(options.fill);
  }

  return true;
}

/**
 * Strokes a line segment. Skips non-finite endpoints and zero-length segments.
 */
export function safeStrokeLine(
  g: SafeGraphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeStyle?: unknown,
): boolean {
  if (!isFinitePoint(x1, y1) || !isFinitePoint(x2, y2)) {
    return false;
  }
  if (x1 === x2 && y1 === y2) {
    return false;
  }

  if (strokeStyle !== undefined && g.setStrokeStyle) {
    g.setStrokeStyle(strokeStyle);
  }
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  if (g.stroke) {
    g.stroke();
  }
  return true;
}

export type StrokeStyleLike = { color?: unknown; width?: unknown; [k: string]: unknown };

function strokeStylesEqual(a: StrokeStyleLike | null, b: StrokeStyleLike): boolean {
  if (!a) {
    return false;
  }
  return a.color === b.color && a.width === b.width;
}

/**
 * Batches line segments that share the same stroke style into a single stroke() call.
 */
export class SafeStrokeBatch {
  private currentStyle: StrokeStyleLike | null = null;
  private hasPath = false;

  constructor(private readonly g: SafeGraphics) {}

  /** Adds a segment; auto-flushes when the style changes. No-op if non-finite or zero length. */
  addLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    style: StrokeStyleLike,
  ): void {
    if (!isFinitePoint(x1, y1) || !isFinitePoint(x2, y2)) {
      return;
    }
    if (x1 === x2 && y1 === y2) {
      return;
    }

    if (!strokeStylesEqual(this.currentStyle, style)) {
      this.flush();
      if (this.g.setStrokeStyle) {
        this.g.setStrokeStyle(style);
      }
      this.currentStyle = { color: style.color, width: style.width };
    }

    this.g.moveTo(x1, y1);
    this.g.lineTo(x2, y2);
    this.hasPath = true;
  }

  /** Strokes the current path if non-empty. */
  flush(): void {
    if (this.hasPath && this.g.stroke) {
      this.g.stroke();
    }
    this.hasPath = false;
    this.currentStyle = null;
  }
}
