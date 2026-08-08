import { EventEmitter } from 'pixi.js';
import type { IObservation, IProtocol, IGraphPreferences, IPeriod } from '@actograph/core';
import type { IGraphRenderOptions } from '../types/graph-render-options';
import { type PaintReason } from '../utils/scene-paint.utils';
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
     * True from the moment `draw()` is requested until its async dispatch
     * (rAF → wait export → drawChain → executeDrawBody) has fully settled.
     * Closes the gap where drawRafId/resolvers are already cleared but
     * executeDrawBody has not yet set drawInProgress/mutating — a window that
     * previously allowed hover to paint.
     */
    private drawDispatchActive;
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
     * Scene paint contract (see `paint()`):
     * - stable: coherent scene, partial paints (hover/pan/…) allowed
     * - mutating: full draw clearing/rebuilding, partial paints forbidden
     * - failed: last draw failed, partial paints forbidden until a successful draw
     *
     * Replaces the old axesGraphicsDirty boolean with an explicit lifecycle.
     */
    private scenePaintState;
    /**
     * Coalesced catch-up: any number of refused partial paints while unstable
     * collapse to a single flag. Flushed once when the scene is stable again
     * (either consumed by draw-complete, or one paint('partial') after dispatch).
     */
    private pendingPartialPaint;
    /**
     * When false, hover/leave/pan cannot paint (Observation→Graphe remount race:
     * layout resize often arms DRAW#2 after the first OK frame; hover must wait
     * until the host re-enables after a settled draw).
     */
    private partialPaintsEnabled;
    private contextRestoring;
    private contextRestoreOuterRafId;
    private contextRestoreInnerRafId;
    /** Émetteur d'événements pour notifier les changements d'état (ex: zoom) */
    events: EventEmitter<string | symbol, any>;
    private zoomState;
    /**
     * Multiplicateurs d'étirement par axe, appliqués par-dessus zoomState.scale.
     * Indépendants du zoom pan/molette/+- (qui reste uniforme) : permettent
     * d'étirer le temps (x) et de compacter les catégories (y) séparément.
     */
    private axisStretch;
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
    redrawCategory(categoryId: string): void;
    redrawObservable(observableId: string): void;
    isDrawInProgress(): boolean;
    /** True when a full draw is queued, dispatching, or executing. */
    private isDrawPipelineBusy;
    /** Partial paints require a coherent scene, idle pipeline, and host enable. */
    private isSceneStableForPartialPaint;
    /**
     * Gate hover/pan paints during remount or resume until layout + draw settle.
     * Authoritative paints (draw-complete) are unaffected.
     */
    setPartialPaintsEnabled(enabled: boolean): void;
    arePartialPaintsEnabled(): boolean;
    /**
     * Sole gateway to `app.render()`.
     *
     * Authoritative reasons (`draw-complete`, `export`, `init`) always paint when
     * the renderer is ready. Partial reasons (`hover`, `leave`, `pan`, …) paint
     * only while the scene is STABLE — otherwise they set `pendingPartialPaint`
     * (coalesced: N refusals → one catch-up) and may schedule a full draw.
     *
     * @returns true when a frame was actually painted
     */
    paint(reason: PaintReason): boolean;
    /**
     * If partial paints were refused while unstable, run at most one catch-up
     * paint now that the scene is stable and the draw pipeline is idle.
     * `paint('partial')` clears the pending flag on success; on refusal it stays
     * set for a later flush.
     */
    private flushPendingPartialPaint;
    /**
     * @deprecated Prefer `paint(reason)`. Kept as a thin alias for pan/zoom paths
     * that do not distinguish pan vs zoom at the call site.
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
     * Redessine les axes/données (labels et marqueurs recréés à chaque draw)
     * pour que le contre-scaling anti-déformation (voir YAxis/xAxis/DataArea)
     * soit appliqué avec la nouvelle valeur.
     */
    setAxisStretch(next: {
        x?: number;
        y?: number;
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