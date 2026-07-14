export type DashedLineOp =
  | { type: 'move'; x: number; y: number }
  | { type: 'line'; x: number; y: number };

/**
 * Computes draw operations for a dashed line, guaranteeing the endpoint is
 * reached with a visible stroke (avoids a gap when the dash pattern ends on
 * an off segment).
 */
export function computeDashedLineOps(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number[] = [10, 5],
): DashedLineOp[] {
  const ops: DashedLineOp[] = [];

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);

  if (len === 0) {
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
    } else {
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
