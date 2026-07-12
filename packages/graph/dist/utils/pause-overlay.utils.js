import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../types/graph-render-options';
export const DEFAULT_PAUSE_OVERLAY_STYLE = {
    color: 0x888888,
    alpha: 0.45,
};
export function shouldDrawPauseOverlay(maskPauses = DEFAULT_GRAPH_RENDER_OPTIONS.maskPauses) {
    return maskPauses !== false;
}
export function resolveMaskPausesOption(options) {
    return shouldDrawPauseOverlay(options?.maskPauses ?? DEFAULT_GRAPH_RENDER_OPTIONS.maskPauses);
}
/**
 * Maps pause intervals to axis-aligned rectangles clipped to the data area.
 * Pure geometry: no PixiJS dependency (testable in isolation).
 */
export function computePauseOverlayRects(periods, bounds, getXFromDate, options) {
    if (!resolveMaskPausesOption(options)) {
        return [];
    }
    const { leftX, rightX, topY, bottomY } = bounds;
    const zoneTopY = Math.min(topY, bottomY);
    const zoneHeight = Math.abs(bottomY - topY);
    if (zoneHeight <= 0 || rightX <= leftX) {
        return [];
    }
    const rects = [];
    for (const period of periods) {
        const rawStartX = getXFromDate(period.start);
        const rawEndX = getXFromDate(period.end);
        const startX = Math.max(leftX, Math.min(rawStartX, rawEndX));
        const endX = Math.min(rightX, Math.max(rawStartX, rawEndX));
        const width = endX - startX;
        if (width <= 0) {
            continue;
        }
        rects.push({
            x: startX,
            y: zoneTopY,
            width,
            height: zoneHeight,
        });
    }
    return rects;
}
//# sourceMappingURL=pause-overlay.utils.js.map