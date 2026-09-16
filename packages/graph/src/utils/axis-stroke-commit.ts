/**
 * Double-buffer commit for axis *strokes* (Graphics in the viewport).
 *
 * Pixi can report empty `getLocalBounds()` on an invisible paint Graphic
 * until that Graphic has been presented. Series layers always swap; axes
 * used to skip the swap in that case, leaving data visible and axis lines
 * missing. The paint-stroke flag is set by `draw()`, independent of bounds.
 */

export function graphicHasLocalGeometry(graphic: {
  getLocalBounds(): { width: number; height: number };
}): boolean {
  const bounds = graphic.getLocalBounds();
  return (
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    (bounds.width > 0 || bounds.height > 0)
  );
}

export class AxisStrokeCommitState {
  private paintHasStrokes = false;
  private displayHasStrokes = false;

  beginPaint(): void {
    this.paintHasStrokes = false;
  }

  markPaintStrokes(): void {
    this.paintHasStrokes = true;
  }

  hasPaintContent(paintGraphic: {
    getLocalBounds(): { width: number; height: number };
  }): boolean {
    return this.paintHasStrokes || graphicHasLocalGeometry(paintGraphic);
  }

  /** Call after a swap (true) or a refused swap that kept the previous display. */
  commit(didSwap: boolean): void {
    this.paintHasStrokes = false;
    if (didSwap) {
      this.displayHasStrokes = true;
    }
  }

  hasDrawnContent(): boolean {
    return this.displayHasStrokes;
  }

  clear(): void {
    this.paintHasStrokes = false;
    this.displayHasStrokes = false;
  }
}
