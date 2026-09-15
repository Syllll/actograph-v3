/**
 * Hauteurs monde de l'axe Y. Partagées entre le layout des ticks et
 * le calcul de la bande verticale d'un arrière-plan ciblé.
 */
export declare const Y_AXIS_LAYOUT: {
    readonly OBSERVABLE_HEIGHT: 30;
    readonly FRIEZE_HEIGHT: 40;
    readonly CATEGORY_SPACING: 15;
};
/**
 * Contour des zones de frise, comme v1 TimeLine.cc (`QColor(150, 150, 150)`).
 * Sans ça, deux états successifs de même couleur (souvent héritée de la
 * catégorie) fusionnent en une bande unique.
 */
export declare const FRIEZE_SEGMENT_STROKE: {
    readonly color: "#969696";
    readonly width: 1;
};
//# sourceMappingURL=axis-layout.constants.d.ts.map