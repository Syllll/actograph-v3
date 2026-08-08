/** Lifecycle of the graph scene relative to WebGL paints. */
export type ScenePaintState = 'stable' | 'mutating' | 'failed';

/**
 * Why a paint was requested. Only `paint()` may call `app.render()`.
 * - Authoritative reasons may paint even while rebuilding (caller guarantees
 *   the scene is ready for that frame).
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

const AUTHORITATIVE_PAINT_REASONS: ReadonlySet<PaintReason> = new Set([
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

/** Reasons that should trigger a full draw when a partial paint is refused. */
export function shouldScheduleDrawOnPaintGate(reason: PaintReason): boolean {
  return reason !== 'leave' && reason !== 'init' && reason !== 'draw-complete' && reason !== 'export';
}

/**
 * Pending partial-paint flag transition.
 * Refusals coalesce to `true`; a successful partial/authoritative catch-up
 * clears to `false`. Multiple refusals never stack beyond one bit.
 */
export function nextPendingPartialPaint(options: {
  pending: boolean;
  event: 'refused' | 'painted' | 'draw-complete-consumed';
}): boolean {
  if (options.event === 'refused') {
    return true;
  }
  return false;
}
