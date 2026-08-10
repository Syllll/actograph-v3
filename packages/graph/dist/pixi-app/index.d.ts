import { EventEmitter } from 'pixi.js';
import type { IObservation, IProtocol, IGraphPreferences, IPeriod } from '@actograph/core';
import type { DrawError } from '../engine/types';
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
    private overlayRoot;
    private plot;
    private xAxis;
    private yAxis;
    private dataArea;
    private graphEngine;
    private exportPipeline;
    private hoverLayer;
    private axisLabelOverlay;
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
    /** Canvas passé à init(); évite d'accéder à app.canvas après destroy. */
    private viewCanvas;
    private isDestroyed;
    private worldBounds;
    private fitViewport;
    private needsInitialFit;
    /** True until the first post-mount layout settle fit completes (interactive only). */
    private layoutFitPending;
    private pausePeriods;
    private graphRenderOptions;
    private exportInProgress;
    private exportQueue;
    private patternStore;
    private renderScheduler;
    private drawFrameScheduled;
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
     * After WebGL context loss, cached pattern textures hold dead GPU resources
     * even if no sprites remain on stage; force a full cache clear on next draw.
     */
    private forcePatternTextureClear;
    /**
     * Per-layer dirty/midDraw state. midDraw is true while a full draw has
     * cleared axis graphics but not yet flushed app.render(). Partial paints
     * (hover, redrawCategory, pan) must not call app.render() while any layer
     * is midDraw — they would show empty axes.
     */
    private dirtyRegistry;
    private contextRestoring;
    private contextRestoreOuterRafId;
    private contextRestoreInnerRafId;
    private viewportPaintRafId;
    private pendingViewportLabelRefresh;
    /** Émetteur d'événements pour notifier les changements d'état (ex: zoom) */
    events: EventEmitter<string | symbol, any>;
    /** Erreurs de la dernière tentative de draw (catégories ou draw complet). */
    private _lastDrawErrors;
    get lastDrawErrors(): ReadonlyArray<DrawError>;
    private zoomState;
    /**
     * Multiplicateurs d'étirement par axe, appliqués par-dessus zoomState.scale.
     * Indépendants du zoom pan/molette/+- (qui reste uniforme) : permettent
     * d'étirer le temps (x) et de compacter les catégories (y) séparément.
     */
    private axisStretch;
    constructor();
    private registerDirtyLayers;
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
     * Re-mesure le canvas après stabilisation du layout (splitter / flex) et
     * force un fit initial. À appeler une fois après le premier setData post-mount.
     */
    settleInitialLayoutFit(): Promise<void>;
    /**
     * Clears hover and marks pattern textures stale before a visibility resume refresh.
     * Forces initial fit so axes cannot stay off-canvas after a bad viewport preserved
     * across tab hide/show.
     */
    prepareForResumeRefresh(): void;
    private cancelContextRestoreRafs;
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
    redrawCategory(_categoryId: string): void;
    redrawObservable(_observableId: string): void;
    isDrawInProgress(): boolean;
    /** Planifie un redraw complet (pas d'auto-retry en boucle). */
    retryDraw(): void;
    /** Emit once per draw with the full error list (empty array on success). */
    private emitDrawErrors;
    /**
     * Renders only when the app is ready and no full draw/export is in flight.
     * If axis graphics were cleared and not yet redrawn, schedules a full draw
     * instead of painting the empty-axes scene (hover/pan must not "exclude" axes).
     */
    requestRender(): void;
    private scheduleDraw;
    draw(): Promise<void>;
    /** Queues an exclusive full redraw on drawChain (used by draw + export). */
    private enqueueDrawBody;
    private executeDrawBody;
    /**
     * Forces Pixi world matrices up to date after viewport pan/zoom.
     * Needed so hover `toGlobal`/`toLocal` (plot bounds, crosshair) stay correct.
     * Pixi 8: use getGlobalTransform() rather than a no-arg updateTransform().
     */
    private collectAxisLabelDescriptors;
    private syncAxisLabelOverlay;
    private refreshAxisLabelOverlay;
    private scheduleViewportPaint;
    private cancelViewportPaintRaf;
    private updateWorldTransforms;
    clear(): Promise<void>;
    private getCanvasSize;
    /**
     * Hauteur totale requise pour un rendu hors-écran complet (export, mobile),
     * en tenant compte de la marge réelle nécessaire sous l'axe X pour les
     * labels inclinés à 45° (peut dépasser largement les 20px fixes de
     * `YAxis.getRequiredHeight()` selon le format de temps choisi, ex. "Full").
     */
    private getRequiredCanvasHeight;
    private updateWorldBounds;
    private recalculateFitViewport;
    private getPlotBoundsInOverlay;
    private setViewportTransform;
    private setupZoomAndPan;
    private updateTimeScale;
    zoomIn(): void;
    zoomOut(): void;
    resetView(): Promise<void>;
    getZoomLevel(): number;
    /**
     * Étirement indépendant par axe (x = temps, y = catégories), appliqué
     * par-dessus le zoom uniforme existant (pan/molette/+-, inchangé).
     * Redessine les axes/données pour appliquer axisStretch aux marques monde
     * (ticks, frises) ; les labels d'axe sont en screen-space (AxisLabelOverlay).
     * Passer `{ redraw: false }` pour mettre à jour le stretch sans peindre
     * (redrawFromObservation appelle toujours draw() après setData).
     */
    setAxisStretch(next: {
        x?: number;
        y?: number;
    }, options?: {
        redraw?: boolean;
    }): Promise<void>;
    getAxisStretch(): {
        x: number;
        y: number;
    };
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