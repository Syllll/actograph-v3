/**
 * Builds full-span crosshair segments that reach both axes of the plot area.
 */
export function computeCrosshairSegments(cursorX, cursorY, bounds) {
    return {
        vertical: {
            x1: cursorX,
            y1: bounds.topY,
            x2: cursorX,
            y2: bounds.bottomY,
        },
        horizontal: {
            x1: bounds.leftX,
            y1: cursorY,
            x2: bounds.rightX,
            y2: cursorY,
        },
    };
}
//# sourceMappingURL=crosshair.utils.js.map