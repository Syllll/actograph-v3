/**
 * Sélectionne les labels dont la boîte horizontale ne chevauche pas le label
 * précédent retenu (parcours gauche → droite). Les ticks d'axe restent inchangés.
 */
export function selectNonOverlappingLabels(items, padding = 4) {
    const kept = new Set();
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
//# sourceMappingURL=axis-label-layout.utils.js.map