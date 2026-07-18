import { EventEmitter } from 'pixi.js';
import type { IObservation, IProtocol, IGraphPreferences, IPeriod } from '@actograph/core';
import type { IGraphRenderOptions } from '../types/graph-render-options';
interface IPixiAppInitOptions {
    view: HTMLCanvasElement;
    interactive?: boolean;
}
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
    private isInteractive;
    private baseCanvasHeight;
    private teardownContextHandlers;
    /**
     * True only once `init()` a fini de créer le renderer PixiJS.
     * En v8, `app.canvas` lit `renderer.canvas` : y accéder avant init (ou après
     * destroy) lève "Cannot read properties of undefined (reading 'canvas')".
     */
    private isInitialized;
    private worldBounds;
    private fitViewport;
    private needsInitialFit;
    private pausePeriods;
    private graphRenderOptions;
    private exportInProgress;
    private exportQueue;
    private drawRafId;
    private drawResolvers;
    private drawInProgress;
    /**
     * Serializes executeDrawBody. Must never await exportQueue while a caller is
     * already on this chain (deadlock with export). External draw() waits for
     * export OFF-chain, then enqueues the body.
     */
    private drawChain;
    private lastObservation;
    private wasDegenerateCanvas;
    /** When true, executeDraw clears pattern textures after detaching sprites. */
    private needsPatternTextureRefresh;
    /**
     * True from the moment a full draw clears axis graphics until axes are
     * successfully stroked again. Partial paints (hover, redrawCategory, pan)
     * must not call app.render() while this is set — they would show empty axes.
     */
    private axesGraphicsDirty;
    /** Émetteur d'événements pour notifier les changements d'état (ex: zoom) */
    events: EventEmitter<string | symbol, any>;
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
    init(options: IPixiAppInitOptions): Promise<void>;
    /**
     * Resize the renderer to match the current CSS size of the canvas element.
     * @param options.skipRender - When true, updates layout/viewport without painting
     *   (caller should follow with a single `draw()`).
     */
    resizeFromCanvas(options?: {
        skipRender?: boolean;
    }): boolean;
    /**
     * Clears hover and marks pattern textures stale before a visibility resume refresh.
     * Forces initial fit so axes cannot stay off-canvas after a bad viewport preserved
     * across tab hide/show.
     */
    prepareForResumeRefresh(): void;
    /**
     * Refresh rendering after window resize, visibility resume, or WebGL context restore.
     */
    refreshAfterResume(): void;
    /**
     * Resolves when all in-flight draws and exports have finished.
     */
    waitForIdle(): Promise<void>;
    private markDegenerateCanvasIfNeeded;
    private reapplyLastObservation;
    private bindWebGLContextHandlers;
    setData(observation: IObservation): void;
    getPausePeriods(): IPeriod[];
    getGraphRenderOptions(): IGraphRenderOptions;
    setGraphRenderOptions(options: Partial<IGraphRenderOptions>, drawOptions?: {
        redraw?: boolean;
    }): void;
    setProtocol(protocol: IProtocol): void;
    getObservablePreferences(observableId: string): IGraphPreferences | null;
    updateObservablePreference(observableId: string, preference: Partial<IGraphPreferences>, options?: {
        redraw?: boolean;
    }): void;
    redrawCategory(categoryId: string): void;
    redrawObservable(observableId: string): void;
    isDrawInProgress(): boolean;
    /**
     * Renders only when the app is ready and no full draw/export is in flight.
     * If axis graphics were cleared and not yet redrawn, schedules a full draw
     * instead of painting the empty-axes scene (hover/pan must not "exclude" axes).
     */
    requestRender(): void;
    draw(): Promise<void>;
    /** Queues an exclusive full redraw on drawChain (used by draw + export). */
    private enqueueDrawBody;
    private executeDrawBody;
    /**
     * Forces Pixi world matrices up to date after viewport pan/zoom.
     * Needed so hover `toGlobal`/`toLocal` (plot bounds, crosshair) stay correct.
     * Pixi 8: use getGlobalTransform() rather than a no-arg updateTransform().
     */
    private updateWorldTransforms;
    clear(): Promise<void>;
    private getCanvasSize;
    private updateWorldBounds;
    private recalculateFitViewport;
    private setViewportTransform;
    private setupZoomAndPan;
    private updateTimeScale;
    zoomIn(): void;
    zoomOut(): void;
    resetView(): Promise<void>;
    getZoomLevel(): number;
    /**
     * Exporte le graphique sous forme d'image (data URL)
     * @param format - Format de l'image : 'png' ou 'jpeg'
     * @param quality - Qualité JPEG (0-1), ignoré pour PNG
     * @returns Data URL de l'image ou null si le canvas n'est pas disponible
     *
     * En mode interactif, le renderer vit à la taille CSS du canvas (plus
     * d'agrandissement à `requiredHeight`, sinon on réintroduirait la boucle de
     * redimensionnement A3). Pour que l'export capture quand même le graphe
     * complet (catégories qui dépassent la boîte CSS incluse), on agrandit
     * temporairement le renderer à la hauteur requise, on rend, on capture, puis
     * on restore la taille d'origine. Aucune écriture sur le DOM : le canvas
     * reste à 100% de son conteneur (la règle `height: 100% !important` de DCanvas
     * neutralise le `style.height` inline écrit par autoDensity), donc pas de
     * boucle ResizeObserver.
     */
    exportAsImage(format?: 'png' | 'jpeg', quality?: number): Promise<string | null>;
    private runExportAsImage;
    destroy(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map