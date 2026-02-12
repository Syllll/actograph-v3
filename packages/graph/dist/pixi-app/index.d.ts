import type { IObservation, IProtocol, IGraphPreferences } from '@actograph/core';
/**
 * Classe principale gérant l'application PixiJS pour le graphique d'activité.
 *
 * ⚠️ NOTES IMPORTANTES POUR L'INTÉGRATION :
 *
 * 1. DIMENSIONS DU CANVAS :
 *    Le canvas DOIT avoir des dimensions valides (width > 0, height > 0) AVANT
 *    d'appeler init(). PixiApp lit les dimensions via getBoundingClientRect().
 *
 * 2. PAS DE resizeTo :
 *    On n'utilise PAS l'option 'resizeTo' de PixiJS car elle peut entrer en
 *    conflit avec la gestion manuelle des dimensions dans DCanvas/mobile.
 *    Les dimensions sont fixées à l'initialisation.
 *
 * 3. NE PAS MODIFIER canvas.width/height APRÈS init() :
 *    Modifier les attributs width/height du canvas EFFACE son contenu.
 *    C'est le comportement standard HTML5 Canvas.
 *
 * 4. ORDRE D'INITIALISATION :
 *    a) Le canvas a ses dimensions CSS et bitmap définies par DCanvas
 *    b) PixiApp.init() est appelé avec le canvas
 *    c) PixiApp lit les dimensions et initialise le renderer
 *    d) setData() puis draw() pour afficher le graphique
 *
 * @see mobile/src/components/app/canvas/DCanvas.vue
 * @see mobile/src/pages/graph/Index.vue
 */
export declare class PixiApp {
    private app;
    private viewport;
    private plot;
    private xAxis;
    private yAxis;
    private dataArea;
    private protocol;
    private zoomState;
    constructor();
    /**
     * Initialize the PixiJS application.
     *
     * ⚠️ PRÉ-REQUIS :
     * - Le canvas doit avoir des dimensions CSS valides (getBoundingClientRect() > 0)
     * - Le canvas doit avoir ses attributs width/height définis (pour le bitmap)
     *
     * @param options.view - L'élément canvas HTML à utiliser
     */
    init(options: {
        view: HTMLCanvasElement;
    }): Promise<void>;
    setData(observation: IObservation): void;
    setProtocol(protocol: IProtocol): void;
    getObservablePreferences(observableId: string): IGraphPreferences | null;
    updateObservablePreference(observableId: string, preference: Partial<IGraphPreferences>): void;
    draw(): Promise<void>;
    clear(): Promise<void>;
    private setupZoomAndPan;
    private updateTimeScale;
    zoomIn(): void;
    zoomOut(): void;
    resetView(): void;
    getZoomLevel(): number;
    /**
     * Exporte le graphique sous forme d'image (data URL)
     * @param format - Format de l'image : 'png' ou 'jpeg'
     * @param quality - Qualité JPEG (0-1), ignoré pour PNG
     * @returns Data URL de l'image ou null si le canvas n'est pas disponible
     */
    exportAsImage(format?: 'png' | 'jpeg', quality?: number): string | null;
    destroy(): void;
}
//# sourceMappingURL=index.d.ts.map