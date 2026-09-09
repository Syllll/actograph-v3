/** Longueur monde d'une graduation, compensée par l'étirement de l'axe opposé. */
export function worldTickLengthForStretch(baseLength, stretch) {
    const safeStretch = Number.isFinite(stretch) && stretch > 0 ? stretch : 1;
    return baseLength / safeStretch;
}
//# sourceMappingURL=tick-stretch.utils.js.map