/** Lifecycle of the graph scene relative to WebGL paints. */
export type ScenePaintState = 'stable' | 'mutating' | 'failed';
/**
 * Why a paint was requested. Only `paint()` may call `app.render()`.
 * - Authoritative reasons may paint even while rebuilding (caller guarantees
 *   the scene is ready for that frame).
 * - Partial reasons only paint when the scene is STABLE.
 */
export type PaintReason = 'init' | 'draw-complete' | 'export' | 'hover' | 'leave' | 'pan' | 'zoom' | 'resize' | 'partial';
export declare function isAuthoritativePaintReason(reason: PaintReason): boolean;
/** Partial paints (hover/pan/…) are allowed only on a coherent idle scene. */
export declare function canPaintPartial(options: {
    scenePaintState: ScenePaintState;
    drawInProgress: boolean;
    exportInProgress: boolean;
    /** True when draw() has been scheduled but executeDrawBody has not finished. */
    drawQueued?: boolean;
}): boolean;
/** Reasons that should trigger a full draw when a partial paint is refused. */
export declare function shouldScheduleDrawOnPaintGate(reason: PaintReason): boolean;
/**
 * Pending partial-paint flag transition.
 * Refusals coalesce to `true`; a successful partial/authoritative catch-up
 * clears to `false`. Multiple refusals never stack beyond one bit.
 */
export declare function nextPendingPartialPaint(options: {
    pending: boolean;
    event: 'refused' | 'painted' | 'draw-complete-consumed';
}): boolean;
//# sourceMappingURL=scene-paint.utils.d.ts.map