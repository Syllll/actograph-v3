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
    return (options.hasCommittedWorld &&
        options.scenePaintState === 'stable' &&
        !options.drawInProgress &&
        !options.exportInProgress &&
        !options.drawQueued);
}
/**
 * Present after a canvas resize: refill the canvas from the last committed
 * scene. Ignores `drawQueued` so a coalesced full draw can still follow;
 * refuses mutating/failed scenes and the empty init paint.
 */
export function canPaintResizePresent(options) {
    return (options.hasCommittedWorld &&
        options.scenePaintState === 'stable' &&
        !options.drawInProgress &&
        !options.exportInProgress);
}
//# sourceMappingURL=scene-paint.utils.js.map