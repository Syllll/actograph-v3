export interface ViewportState {
    x: number;
    y: number;
    /** Échelle horizontale (temps). Distincte de scaleY pour permettre l'étirement de l'axe X indépendamment. */
    scaleX: number;
    /** Échelle verticale (catégories). Distincte de scaleX pour permettre la compaction de l'axe Y indépendamment. */
    scaleY: number;
}
export interface WorldBounds {
    width: number;
    height: number;
}
export interface CanvasSize {
    width: number;
    height: number;
}
/** True when CSS/bitmap dimensions are too small to paint a meaningful frame. */
export declare function isDegenerateCanvasSize(width: number, height: number): boolean;
/**
 * Scale initial (uniforme) pour faire tenir le plot entier dans le canvas (mode interactif).
 * Ne zoome pas au-delà de 1 si le contenu est déjà plus petit que le canvas.
 * Reste volontairement une échelle unique : c'est la base du zoom pan/molette/+- ;
 * l'étirement par axe (axisStretch) est composé par-dessus par l'appelant.
 */
export declare function computeFitScale(worldBounds: WorldBounds, canvasSize: CanvasSize, minScale: number, maxScale: number): number;
/**
 * Position du viewport pour centrer le plot quand il est plus petit que le canvas.
 */
export declare function computeFitViewportPosition(worldBounds: WorldBounds, canvasSize: CanvasSize, scaleX: number, scaleY: number): {
    x: number;
    y: number;
};
/**
 * Borne le viewport pour éviter de montrer une zone vide hors du plot.
 * scaleX/scaleY sont bornés indépendamment (largeur contre scaleX, hauteur contre scaleY).
 */
export declare function clampViewport(viewport: ViewportState, worldBounds: WorldBounds, canvasSize: CanvasSize, margin?: number): ViewportState;
/**
 * Fit viewport for a given world size and canvas (used on init, export, resize).
 * Le fit reste uniforme (scaleX === scaleY) : c'est la base neutre avant application
 * de l'étirement par axe par l'appelant (PixiApp.axisStretch).
 */
export declare function computeFitViewport(worldBounds: WorldBounds, canvasSize: CanvasSize, minScale: number, maxScale: number): ViewportState;
/**
 * Re-clamps the current viewport after a canvas resize (preserves user zoom).
 */
export declare function preserveViewportOnResize(viewport: ViewportState, worldBounds: WorldBounds, canvasSize: CanvasSize): ViewportState;
//# sourceMappingURL=viewport.utils.d.ts.map