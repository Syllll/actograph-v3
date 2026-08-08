/** Above this many dash operations, a solid line is drawn instead. */
const MAX_DASH_OPS = 4000;
/**
 * Computes draw operations for a dashed line, guaranteeing the endpoint is
 * reached with a visible stroke (avoids a gap when the dash pattern ends on
 * an off segment).
 */
export function computeDashedLineOps(x1, y1, x2, y2, dash = [10, 5]) {
    const ops = [];
    // A NaN/Infinity endpoint used to fall through the loop and still emit a
    // lineTo(NaN, NaN): a single non-finite vertex corrupts the whole WebGL batch,
    // dropping every other shape drawn in the same frame.
    if (!Number.isFinite(x1) ||
        !Number.isFinite(y1) ||
        !Number.isFinite(x2) ||
        !Number.isFinite(y2)) {
        return ops;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) {
        return ops;
    }
    // Very long spans would emit tens of thousands of dashes. Past the 16-bit
    // index limit the stroke geometry wraps around and breaks the frame, so fall
    // back to a solid line rather than producing unbounded geometry.
    const patternLength = dash.reduce((total, part) => total + part, 0);
    if (patternLength <= 0 || (len / patternLength) * dash.length > MAX_DASH_OPS) {
        ops.push({ type: 'move', x: x1, y: y1 });
        ops.push({ type: 'line', x: x2, y: y2 });
        return ops;
    }
    const angle = Math.atan2(dy, dx);
    let dist = 0;
    let draw = true;
    let dashIndex = 0;
    let penX = x1;
    let penY = y1;
    let lastDrawn = false;
    while (dist < len) {
        const step = Math.min(dash[dashIndex % dash.length], len - dist);
        const nx = x1 + Math.cos(angle) * (dist + step);
        const ny = y1 + Math.sin(angle) * (dist + step);
        if (draw) {
            if (!lastDrawn) {
                ops.push({ type: 'move', x: penX, y: penY });
            }
            ops.push({ type: 'line', x: nx, y: ny });
            lastDrawn = true;
        }
        else {
            ops.push({ type: 'move', x: nx, y: ny });
            lastDrawn = false;
        }
        penX = nx;
        penY = ny;
        dist += step;
        draw = !draw;
        dashIndex += 1;
    }
    if (!lastDrawn || penX !== x2 || penY !== y2) {
        if (!lastDrawn) {
            ops.push({ type: 'move', x: penX, y: penY });
        }
        ops.push({ type: 'line', x: x2, y: y2 });
    }
    return ops;
}
//# sourceMappingURL=dashed-line.utils.js.map