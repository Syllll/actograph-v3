/** Lifecycle of the graph scene relative to WebGL paints. */
export type ScenePaintState = 'stable' | 'mutating' | 'failed';

/**
 * Why a paint was requested. Only `paint()` may call `app.render()`.
 *
 * Two queues, never mixed:
 * - Build: `scheduleDraw` / `draw` / `executeDrawBody` / `prepareWorld`.
 * - Present: `requestRender` / `paint`. Never starts a build.
 *
 * - Authoritative reasons may paint even while rebuilding (caller guarantees
 *   the scene is ready for that frame).
 * - `resize` refills the canvas after `renderer.resize()` from the last
 *   committed scene. Allowed while a full draw is queued, never while
 *   mutating or failed.
 * - Partial reasons (hover, pan, zoom, time-format labels) only paint when
 *   the scene is STABLE and a world with axis strokes has been committed.
 *   A refused present is a no-op: wait for the current build, or for retry
 *   after `failed`.
 */
export type PaintReason =
  | 'init'
  | 'draw-complete'
  | 'export'
  | 'hover'
  | 'leave'
  | 'pan'
  | 'zoom'
  | 'resize'
  | 'partial';

const AUTHORITATIVE_PAINT_REASONS = new Set<PaintReason>([
  'init',
  'draw-complete',
  'export',
]);

export function isAuthoritativePaintReason(reason: PaintReason): boolean {
  return AUTHORITATIVE_PAINT_REASONS.has(reason);
}

/** Partial paints (hover/pan/…) are allowed only on a coherent idle scene. */
export function canPaintPartial(options: {
  scenePaintState: ScenePaintState;
  drawInProgress: boolean;
  exportInProgress: boolean;
  /** True when draw() has been scheduled but executeDrawBody has not finished. */
  drawQueued?: boolean;
  /** False until a successful draw-complete with axis strokes on the display. */
  hasCommittedWorld: boolean;
}): boolean {
  return (
    options.hasCommittedWorld &&
    options.scenePaintState === 'stable' &&
    !options.drawInProgress &&
    !options.exportInProgress &&
    !options.drawQueued
  );
}

/**
 * Present after a canvas resize: refill the canvas from the last committed
 * scene. Ignores `drawQueued` so a coalesced full draw can still follow;
 * refuses mutating/failed scenes and the empty init paint.
 */
export function canPaintResizePresent(options: {
  scenePaintState: ScenePaintState;
  drawInProgress: boolean;
  exportInProgress: boolean;
  hasCommittedWorld: boolean;
}): boolean {
  return (
    options.hasCommittedWorld &&
    options.scenePaintState === 'stable' &&
    !options.drawInProgress &&
    !options.exportInProgress
  );
}
