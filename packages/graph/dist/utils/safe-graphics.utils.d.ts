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
export declare function isFiniteNumber(n: number): boolean;
export declare function isFinitePoint(x: number, y: number): boolean;
export declare function safeMoveTo(g: SafeGraphics, x: number, y: number): boolean;
export declare function safeLineTo(g: SafeGraphics, x: number, y: number): boolean;
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
export declare function safeRect(g: SafeGraphics, x: number, y: number, w: number, h: number, options?: SafeRectOptions): boolean;
/**
 * Draws an ellipse when center and radii are finite and radii are positive.
 * Returns false on invalid geometry (no-op).
 */
export declare function safeEllipse(g: SafeGraphics, x: number, y: number, rx: number, ry: number, options?: SafeEllipseOptions): boolean;
/**
 * Strokes a line segment. Skips non-finite endpoints and zero-length segments.
 */
export declare function safeStrokeLine(g: SafeGraphics, x1: number, y1: number, x2: number, y2: number, strokeStyle?: unknown): boolean;
export type StrokeStyleLike = {
    color?: unknown;
    width?: unknown;
    [k: string]: unknown;
};
/**
 * Batches line segments that share the same stroke style into a single stroke() call.
 */
export declare class SafeStrokeBatch {
    private readonly g;
    private currentStyle;
    private hasPath;
    constructor(g: SafeGraphics);
    /** Adds a segment; auto-flushes when the style changes. No-op if non-finite or zero length. */
    addLine(x1: number, y1: number, x2: number, y2: number, style: StrokeStyleLike): void;
    /** Strokes the current path if non-empty. */
    flush(): void;
}
//# sourceMappingURL=safe-graphics.utils.d.ts.map