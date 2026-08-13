/** Lifecycle of the graph scene relative to WebGL paints. */
export type ScenePaintState = 'stable' | 'mutating' | 'failed';

/**
 * Why a paint was requested. Only `paint()` may call `app.render()`.
 * - Authoritative reasons may paint even while rebuilding (caller guarantees
 *   the scene is ready for that frame).
 * - `resize` refills the default framebuffer after `renderer.resize()` from
 *   the last committed scene. Allowed while a full draw is queued, never
 *   while mutating or failed.
 * - Partial reasons only paint when the scene is STABLE.
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
}): boolean {
  return (
    options.scenePaintState === 'stable' &&
    !options.drawInProgress &&
    !options.exportInProgress &&
    !options.drawQueued
  );
}

/**
 * Present after a canvas resize: refill the (cleared) default framebuffer
 * from the last committed scene. Ignores `drawQueued` so a coalesced full
 * draw can still follow; refuses mutating/failed scenes.
 */
export function canPaintResizePresent(options: {
  scenePaintState: ScenePaintState;
  drawInProgress: boolean;
  exportInProgress: boolean;
}): boolean {
  return (
    options.scenePaintState === 'stable' &&
    !options.drawInProgress &&
    !options.exportInProgress
  );
}

/** Reasons that should trigger a full draw when a partial paint is refused. */
export function shouldScheduleDrawOnPaintGate(reason: PaintReason): boolean {
  return (
    reason !== 'leave' &&
    reason !== 'init' &&
    reason !== 'draw-complete' &&
    reason !== 'export' &&
    reason !== 'resize'
  );
}
