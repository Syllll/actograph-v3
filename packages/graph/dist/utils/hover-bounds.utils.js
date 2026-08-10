/** Convertit un point world (global Pixi) vers coords locales d'un overlay screen-space. */
export function worldGlobalToOverlayLocal(global, overlay) {
    return overlay.toLocal(global);
}
export function computePlotBoundsInOverlay(args) {
    const { yAxisStart, yAxisEnd, xAxisEnd, yAxisToGlobal, xAxisToGlobal, overlayToLocal } = args;
    if (typeof xAxisEnd.x !== 'number' ||
        typeof xAxisEnd.y !== 'number') {
        return null;
    }
    const bottomLeft = overlayToLocal(yAxisToGlobal(yAxisStart));
    const topLeft = overlayToLocal(yAxisToGlobal(yAxisEnd));
    const bottomRight = overlayToLocal(xAxisToGlobal(xAxisEnd));
    return {
        leftX: bottomLeft.x,
        rightX: bottomRight.x,
        topY: topLeft.y,
        bottomY: bottomLeft.y,
    };
}
//# sourceMappingURL=hover-bounds.utils.js.map