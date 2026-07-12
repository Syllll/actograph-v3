const DEFAULT_OVERSCROLL_MARGIN = 24;
/**
 * Scale initial pour faire tenir le plot entier dans le canvas (mode interactif).
 * Ne zoome pas au-delà de 1 si le contenu est déjà plus petit que le canvas.
 */
export function computeFitScale(worldBounds, canvasSize, minScale, maxScale) {
    if (worldBounds.width <= 0 || worldBounds.height <= 0) {
        return 1;
    }
    const scaleX = canvasSize.width / worldBounds.width;
    const scaleY = canvasSize.height / worldBounds.height;
    const rawFit = Math.min(scaleX, scaleY, 1);
    return Math.max(minScale, Math.min(maxScale, rawFit));
}
/**
 * Position du viewport pour centrer le plot quand il est plus petit que le canvas.
 */
export function computeFitViewportPosition(worldBounds, canvasSize, scale) {
    const scaledWidth = worldBounds.width * scale;
    const scaledHeight = worldBounds.height * scale;
    const x = scaledWidth < canvasSize.width ? (canvasSize.width - scaledWidth) / 2 : 0;
    const y = scaledHeight < canvasSize.height ? (canvasSize.height - scaledHeight) / 2 : 0;
    return { x, y };
}
/**
 * Borne le viewport pour éviter de montrer une zone vide hors du plot.
 */
export function clampViewport(viewport, worldBounds, canvasSize, margin = DEFAULT_OVERSCROLL_MARGIN) {
    const { scale } = viewport;
    const scaledWidth = worldBounds.width * scale;
    const scaledHeight = worldBounds.height * scale;
    let x = viewport.x;
    let y = viewport.y;
    if (scaledWidth <= canvasSize.width) {
        x = (canvasSize.width - scaledWidth) / 2;
    }
    else {
        const minX = canvasSize.width - scaledWidth - margin;
        const maxX = margin;
        x = Math.max(minX, Math.min(maxX, x));
    }
    if (scaledHeight <= canvasSize.height) {
        y = (canvasSize.height - scaledHeight) / 2;
    }
    else {
        const minY = canvasSize.height - scaledHeight - margin;
        const maxY = margin;
        y = Math.max(minY, Math.min(maxY, y));
    }
    return { x, y, scale };
}
/**
 * Fit viewport for a given world size and canvas (used on init, export, resize).
 */
export function computeFitViewport(worldBounds, canvasSize, minScale, maxScale) {
    const scale = computeFitScale(worldBounds, canvasSize, minScale, maxScale);
    const position = computeFitViewportPosition(worldBounds, canvasSize, scale);
    return { scale, x: position.x, y: position.y };
}
/**
 * Re-clamps the current viewport after a canvas resize (preserves user zoom).
 */
export function preserveViewportOnResize(viewport, worldBounds, canvasSize) {
    return clampViewport(viewport, worldBounds, canvasSize);
}
//# sourceMappingURL=viewport.utils.js.map