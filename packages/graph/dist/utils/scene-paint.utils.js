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
/**
 * Present after a canvas resize: refill the (cleared) default framebuffer
 * from the last committed scene. Ignores `drawQueued` so a coalesced full
 * draw can still follow; refuses mutating/failed scenes.
 */
export function canPaintResizePresent(options) {
    return (options.scenePaintState === 'stable' &&
        !options.drawInProgress &&
        !options.exportInProgress);
}
/** Reasons that should trigger a full draw when a partial paint is refused. */
export function shouldScheduleDrawOnPaintGate(reason) {
    return (reason !== 'leave' &&
        reason !== 'init' &&
        reason !== 'draw-complete' &&
        reason !== 'export' &&
        reason !== 'resize');
}
//# sourceMappingURL=scene-paint.utils.js.map