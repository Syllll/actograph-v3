/** Longueur monde d'une graduation, compensée par l'étirement de l'axe opposé. */
export function worldTickLengthForStretch(
  baseLength: number,
  stretch: number,
): number {
  const safeStretch = Number.isFinite(stretch) && stretch > 0 ? stretch : 1;
  return baseLength / safeStretch;
}
