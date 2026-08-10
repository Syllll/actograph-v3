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
export declare function selectNonOverlappingLabels(items: AxisLabelLayoutItem[], padding?: number): Set<string>;
//# sourceMappingURL=axis-label-layout.utils.d.ts.map