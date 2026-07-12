export interface ViewportState {
    x: number;
    y: number;
    scale: number;
}
export interface WorldBounds {
    width: number;
    height: number;
}
export interface CanvasSize {
    width: number;
    height: number;
}
/**
 * Scale initial pour faire tenir le plot entier dans le canvas (mode interactif).
 * Ne zoome pas au-delà de 1 si le contenu est déjà plus petit que le canvas.
 */
export declare function computeFitScale(worldBounds: WorldBounds, canvasSize: CanvasSize, minScale: number, maxScale: number): number;
/**
 * Position du viewport pour centrer le plot quand il est plus petit que le canvas.
 */
export declare function computeFitViewportPosition(worldBounds: WorldBounds, canvasSize: CanvasSize, scale: number): {
    x: number;
    y: number;
};
/**
 * Borne le viewport pour éviter de montrer une zone vide hors du plot.
 */
export declare function clampViewport(viewport: ViewportState, worldBounds: WorldBounds, canvasSize: CanvasSize, margin?: number): ViewportState;
/**
 * Fit viewport for a given world size and canvas (used on init, export, resize).
 */
export declare function computeFitViewport(worldBounds: WorldBounds, canvasSize: CanvasSize, minScale: number, maxScale: number): ViewportState;
/**
 * Re-clamps the current viewport after a canvas resize (preserves user zoom).
 */
export declare function preserveViewportOnResize(viewport: ViewportState, worldBounds: WorldBounds, canvasSize: CanvasSize): ViewportState;
//# sourceMappingURL=viewport.utils.d.ts.map