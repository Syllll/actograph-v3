const AUTHORITATIVE_PAINT_REASONS = new Set([
    'init',
    'draw-complete',
    'export',
]);
export function isAuthoritativePaintReason(reason) {
    return AUTHORITATIVE_PAINT_REASONS.has(reason);
}
/** Partial paints (hover/pan/…) are allowed only on a coherent idle scene. */
export function canPaintPartial(options) {
    return (options.scenePaintState === 'stable' &&
        !options.drawInProgress &&
        !options.exportInProgress &&
        !options.drawQueued);
}
/** Reasons that should trigger a full draw when a partial paint is refused. */
export function shouldScheduleDrawOnPaintGate(reason) {
    return reason !== 'leave' && reason !== 'init' && reason !== 'draw-complete' && reason !== 'export';
}
/**
 * Pending partial-paint flag transition.
 * Refusals coalesce to `true`; a successful partial/authoritative catch-up
 * clears to `false`. Multiple refusals never stack beyond one bit.
 */
export function nextPendingPartialPaint(options) {
    if (options.event === 'refused') {
        return true;
    }
    return false;
}
//# sourceMappingURL=scene-paint.utils.js.map