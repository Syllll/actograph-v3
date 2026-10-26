export interface AxisLabelLayoutItem {
  id: string;
  x: number;
  width: number;
  anchorX?: number;
}

/**
 * Sélectionne les labels dont la boîte horizontale ne chevauche pas le label
 * précédent retenu (parcours gauche → droite). Les ticks d'axe restent inchangés.
 */
export function selectNonOverlappingLabels(
  items: AxisLabelLayoutItem[],
  padding = 4,
): Set<string> {
  const kept = new Set<string>();
  let previousRightEdge = -Infinity;

  const sorted = [...items].sort((a, b) => a.x - b.x);

  for (const item of sorted) {
    const anchorX = item.anchorX ?? 0;
    const leftEdge = item.x - item.width * anchorX;
    const rightEdge = leftEdge + item.width;

    if (leftEdge >= previousRightEdge + padding) {
      kept.add(item.id);
      previousRightEdge = rightEdge;
    }
  }

  return kept;
}

/** Bounds relative to a label's anchor, after rotation in screen pixels. */
export function rotatedLabelBounds(
  width: number, height: number, angleDeg: number, anchorX: number, anchorY = 0,
): { left: number; right: number; top: number; bottom: number } {
  const radians = angleDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners = [
    [-width * anchorX, -height * anchorY],
    [width * (1 - anchorX), -height * anchorY],
    [-width * anchorX, height * (1 - anchorY)],
    [width * (1 - anchorX), height * (1 - anchorY)],
  ].map(([x, y]) => ({ x: x! * cos - y! * sin, y: x! * sin + y! * cos }));
  return {
    left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)),
    top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)),
  };
}

/** Evaluate all candidates before collision filtering so Auto cannot oscillate. */
export function resolveAutomaticLabelAngle(items: AxisLabelLayoutItem[], padding = 4): 0 | 45 {
  return selectNonOverlappingLabels(items, padding).size === items.length ? 0 : 45;
}
