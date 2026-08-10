/** Whether hover crosshair and dynamic time label should be rendered. */
export function shouldRenderHoverOverlay(state) {
    return state.interactive && !state.suppressed;
}
/** True when (x, y) lies inside the plot rectangle (overlay local space). */
export function isPointInsidePlotBounds(x, y, bounds) {
    return (x >= bounds.leftX &&
        x <= bounds.rightX &&
        y >= bounds.topY &&
        y <= bounds.bottomY);
}
//# sourceMappingURL=hover-overlay.utils.js.map