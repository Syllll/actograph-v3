/**
 * Hauteurs monde de l'axe Y. Partagées entre le layout des ticks et
 * le calcul de la bande verticale d'un arrière-plan ciblé.
 */
export const Y_AXIS_LAYOUT = {
  OBSERVABLE_HEIGHT: 30,
  FRIEZE_HEIGHT: 40,
  CATEGORY_SPACING: 15,
} as const;

/**
 * Contour des zones de frise, comme v1 TimeLine.cc (`QColor(150, 150, 150)`).
 * Sans ça, deux états successifs de même couleur (souvent héritée de la
 * catégorie) fusionnent en une bande unique.
 */
export const FRIEZE_SEGMENT_STROKE = {
  color: '#969696',
  width: 1,
} as const;
