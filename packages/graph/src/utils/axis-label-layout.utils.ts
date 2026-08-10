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
