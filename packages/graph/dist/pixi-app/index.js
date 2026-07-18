import { Application, Container, EventEmitter } from 'pixi.js';
import { xAxis } from './axis/x-axis';
import { YAxis } from './axis/y-axis';
import { DataArea } from './data-area';
import { filterReadingsForGraphDisplay } from '@actograph/core';
import { getGraphPausePeriods } from '../utils/pause-periods.utils';
import { getObservableGraphPreferences, hydrateProtocolItemsFromStringIfNeeded } from '../utils/protocol.utils';
import { clearPatternTextureCache } from '../lib/pattern-textures';
import { clampViewport, computeFitViewport, isDegenerateCanvasSize, preserveViewportOnResize, } from '../utils/viewport.utils';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../types/graph-render-options';
import { GRAPH_CANVAS_CURSOR_IDLE, GRAPH_CANVAS_CURSOR_PANNING, } from '../utils/graph-cursor.constants';
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
export class PixiApp {
    constructor() {
        this.protocol = null;
        this.isInteractive = true;
        this.baseCanvasHeight = 0;
        this.teardownContextHandlers = null;
        /**
         * True only once `init()` a fini de créer le renderer PixiJS.
         * En v8, `app.canvas` lit `renderer.canvas` : y accéder avant init (ou après
         * destroy) lève "Cannot read properties of undefined (reading 'canvas')".
         */
        this.isInitialized = false;
        this.worldBounds = { width: 1, height: 1 };
        this.fitViewport = { scale: 1, x: 0, y: 0 };
        this.needsInitialFit = false;
        this.pausePeriods = [];
        this.graphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };
        this.exportInProgress = false;
        this.exportQueue = Promise.resolve();
        this.drawRafId = null;
        this.drawResolvers = [];
        this.drawInProgress = false;
        /**
         * Serializes executeDrawBody. Must never await exportQueue while a caller is
         * already on this chain (deadlock with export). External draw() waits for
         * export OFF-chain, then enqueues the body.
         */
        this.drawChain = Promise.resolve();
        this.lastObservation = null;
        this.wasDegenerateCanvas = false;
        /** When true, executeDraw clears pattern textures after detaching sprites. */
        this.needsPatternTextureRefresh = false;
        /**
         * True from the moment a full draw clears axis graphics until axes are
         * successfully stroked again. Partial paints (hover, redrawCategory, pan)
         * must not call app.render() while this is set — they would show empty axes.
         */
        this.axesGraphicsDirty = false;
        /** Émetteur d'événements pour notifier les changements d'état (ex: zoom) */
        this.events = new EventEmitter();
        this.zoomState = {
            scale: 1,
            minScale: 0.1,
            maxScale: 5,
            x: 0,
            y: 0,
            isPanning: false,
            panStartX: 0,
            panStartY: 0,
            // Propriétés pour le pinch-to-zoom tactile
            lastPinchDistance: 0,
            lastPinchCenter: { x: 0, y: 0 },
            isPinching: false,
        };
        this.app = new Application();
    }
    /**
     * Initialize the PixiJS application.
     *
     * ⚠️ PRÉ-REQUIS :
     * - Le canvas doit avoir des dimensions CSS valides (getBoundingClientRect() > 0)
     * - Le canvas doit avoir ses attributs width/height définis (pour le bitmap)
     *
     * @param options.view - L'élément canvas HTML à utiliser
     */
    async init(options) {
        const canvas = options.view;
        this.isInteractive = options.interactive ?? true;
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        // Lire les dimensions CSS actuelles du canvas
        // Note: DCanvas doit avoir déjà configuré ces dimensions
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        this.baseCanvasHeight = height;
        console.log('[PixiApp] Init with dimensions:', width, 'x', height, 'dpr:', dpr);
        await this.app.init({
            background: 'white',
            canvas: canvas, // PixiJS v8 : utiliser 'canvas' au lieu de 'view' (déprécié)
            width: width,
            height: height,
            resolution: dpr, // Pour les écrans HiDPI
            autoDensity: true, // Ajuste automatiquement la densité
            preserveDrawingBuffer: true, // Required for canvas.toDataURL() to produce non-black exports
            // ⚠️ PAS DE resizeTo - on contrôle les dimensions manuellement via DCanvas
            // Utiliser resizeTo causerait des conflits avec notre gestion des dimensions
        });
        this.yAxis = new YAxis(this.app);
        this.xAxis = new xAxis(this.app, this.yAxis);
        this.dataArea = new DataArea(this.app, this.yAxis, this.xAxis, {
            interactive: this.isInteractive,
        });
        this.dataArea.setDrawStateCallbacks({
            isDrawInProgress: () => this.isDrawInProgress(),
            requestRender: () => this.requestRender(),
        });
        this.viewport = new Container();
        this.viewport.x = 0;
        this.viewport.y = 0;
        this.viewport.scale.set(1);
        this.plot = new Container();
        this.plot.addChild(this.xAxis);
        this.plot.addChild(this.yAxis);
        this.plot.addChild(this.dataArea);
        this.dataArea.setPlotContainer(this.plot);
        this.viewport.addChild(this.plot);
        this.app.stage.addChild(this.viewport);
        this.yAxis.init();
        this.xAxis.init();
        this.dataArea.init();
        this.setupZoomAndPan();
        this.bindWebGLContextHandlers();
        this.isInitialized = true;
        if (this.isInteractive) {
            this.needsInitialFit = true;
        }
        // Premier rendu immédiat pour effacer le buffer WebGL (noir) avec le
        // fond blanc, avant même que les données soient dessinées.
        this.app.render();
    }
    /**
     * Resize the renderer to match the current CSS size of the canvas element.
     * @param options.skipRender - When true, updates layout/viewport without painting
     *   (caller should follow with a single `draw()`).
     */
    resizeFromCanvas(options) {
        // Le renderer n'existe pas tant que init() n'a pas abouti (ou après destroy).
        // Accéder à app.canvas/renderer avant cela lèverait une exception.
        if (!this.isInitialized || !this.app.renderer || this.exportInProgress) {
            return false;
        }
        const canvas = this.app.canvas;
        if (!canvas) {
            return false;
        }
        const rect = canvas.getBoundingClientRect();
        const rawWidth = Math.floor(rect.width);
        const rawHeight = Math.floor(rect.height);
        if (isDegenerateCanvasSize(rawWidth, rawHeight)) {
            this.wasDegenerateCanvas = true;
            return false;
        }
        const width = Math.max(1, rawWidth);
        const height = Math.max(1, rawHeight);
        if (this.wasDegenerateCanvas && this.isInteractive) {
            this.needsInitialFit = true;
            this.wasDegenerateCanvas = false;
        }
        // Anti-boucle ResizeObserver : si la taille n'a pas réellement changé, ne
        // pas re-déclencher un resize + render (qui pourrait relancer un cycle de
        // mesure/layout et faire « vibrer » le canvas et le watermark).
        if (width === this.app.screen.width && height === this.app.screen.height) {
            return false;
        }
        // Garde de sécurité : rejeter toute dimension manifestement absurde. Si la
        // chaîne de hauteur du conteneur passe transitoirement en 'auto' lors d'un
        // relayout, `getBoundingClientRect()` peut renvoyer une valeur géante qui
        // se propagerait au renderer. On plafonne à un multiple généreux du
        // viewport pour casser net la boucle si elle se déclenche quand même.
        const fallbackW = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const fallbackH = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const maxWidth = fallbackW * 4;
        const maxHeight = fallbackH * 4;
        if (!Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width > maxWidth ||
            height > maxHeight) {
            return false;
        }
        this.app.renderer.resize(width, height);
        if (this.isInteractive) {
            this.updateWorldBounds();
            this.recalculateFitViewport();
            const clamped = preserveViewportOnResize({
                scale: this.zoomState.scale,
                x: this.viewport.x,
                y: this.viewport.y,
            }, this.worldBounds, this.getCanvasSize());
            this.setViewportTransform(clamped, {
                emitZoom: false,
                skipRender: options?.skipRender,
            });
        }
        else if (!options?.skipRender) {
            this.app.render();
        }
        return true;
    }
    /**
     * Clears hover and marks pattern textures stale before a visibility resume refresh.
     * Forces initial fit so axes cannot stay off-canvas after a bad viewport preserved
     * across tab hide/show.
     */
    prepareForResumeRefresh() {
        this.dataArea.clearHoverOverlay();
        this.needsPatternTextureRefresh = true;
        // Always re-fit on resume: preserving zoom across a hidden tab often leaves
        // the camera on an empty region (axes "disappeared", one data fragment left).
        this.needsInitialFit = true;
        this.wasDegenerateCanvas = true;
        this.markDegenerateCanvasIfNeeded();
    }
    /**
     * Refresh rendering after window resize, visibility resume, or WebGL context restore.
     */
    refreshAfterResume() {
        if (!this.isInitialized) {
            return;
        }
        this.dataArea.clearHoverOverlay();
        this.needsPatternTextureRefresh = true;
        this.needsInitialFit = true;
        this.wasDegenerateCanvas = true;
        if (this.lastObservation) {
            this.reapplyLastObservation();
        }
        this.markDegenerateCanvasIfNeeded();
        this.resizeFromCanvas({ skipRender: true });
        void this.draw();
    }
    /**
     * Resolves when all in-flight draws and exports have finished.
     */
    waitForIdle() {
        const exportGate = this.exportInProgress ? this.exportQueue : Promise.resolve();
        return Promise.all([this.drawChain, exportGate]).then(() => undefined);
    }
    markDegenerateCanvasIfNeeded() {
        const canvas = this.app.canvas;
        if (!canvas) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        if (isDegenerateCanvasSize(rect.width, rect.height)) {
            this.wasDegenerateCanvas = true;
        }
    }
    reapplyLastObservation() {
        if (!this.lastObservation) {
            return;
        }
        this.setData(this.lastObservation);
    }
    bindWebGLContextHandlers() {
        const canvas = this.app.canvas;
        if (!canvas) {
            return;
        }
        const onContextLost = (event) => {
            event.preventDefault();
            this.dataArea.clearHoverOverlay();
            this.needsPatternTextureRefresh = true;
            this.axesGraphicsDirty = true;
            // Force fit after restore: GPU context loss often coincides with a bad
            // or stale viewport even when CSS size still looks valid.
            this.wasDegenerateCanvas = true;
        };
        const onContextRestored = () => {
            this.refreshAfterResume();
        };
        canvas.addEventListener('webglcontextlost', onContextLost, false);
        canvas.addEventListener('webglcontextrestored', onContextRestored, false);
        this.teardownContextHandlers = () => {
            canvas.removeEventListener('webglcontextlost', onContextLost);
            canvas.removeEventListener('webglcontextrestored', onContextRestored);
            this.teardownContextHandlers = null;
        };
    }
    setData(observation) {
        if (!observation.readings) {
            throw new Error('Observation must have readings');
        }
        if (!observation.protocol) {
            throw new Error('Observation must have protocol');
        }
        this.protocol = observation.protocol;
        this.dataArea.setProtocol(observation.protocol);
        const graphObservation = {
            ...observation,
            readings: filterReadingsForGraphDisplay(observation.readings),
        };
        this.lastObservation = graphObservation;
        this.pausePeriods = getGraphPausePeriods(graphObservation.readings ?? []);
        this.yAxis.setData(graphObservation);
        this.xAxis.setGraphRenderOptions(this.graphRenderOptions);
        this.xAxis.setData(graphObservation);
        this.dataArea.setPausePeriods(this.pausePeriods);
        this.dataArea.setGraphRenderOptions(this.graphRenderOptions);
        this.dataArea.setData(graphObservation);
        // Mode interactif (graphe desktop) : on ne fait JAMAIS grossir le renderer
        // au-delà de la boîte CSS du canvas. Avant, `app.renderer.resize(w,
        // requiredHeight)` écrivait `canvas.style.height = requiredHeight px` en
        // inline (autoDensity), ce qui déclenchaît une boucle ResizeObserver avec
        // le conteneur observé par DCanvas : lors d'un relayout du splitter la
        // chaîne de hauteur passait transitoirement en 'auto', une mesure géante
        // se figeait en inline !important, et le graphe disparaissait derrière une
        // scrollbar immense. Le graphe vit désormais dans sa boîte CSS ; un
        // dépassement vertical éventuel est géré par le pan/zoom interne, et
        // l'export complet est assuré par exportAsImage (resize temporaire).
        if (this.isInteractive) {
            return;
        }
        // Mode non-interactif (rendu mobile, export plein graphe) : on agrandit le
        // renderer à requiredHeight pour obtenir le bitmap complet, et on fait
        // correspondre la hauteur du conteneur DOM parent pour permettre le scroll
        // vertical (mécanisme de scroll du graphe mobile). Cette branche ne
        // s'exécute JAMAIS en mode interactif (desktop), donc elle n'alimente pas
        // la boucle A3 : le bug desktop venait de la branche interactive + des
        // écritures inline de DCanvas, pas d'ici.
        const requiredHeight = this.yAxis.getRequiredHeight();
        const currentWidth = this.app.screen.width;
        const currentHeight = this.app.screen.height;
        const targetHeight = Math.max(this.baseCanvasHeight, requiredHeight);
        if (targetHeight !== currentHeight) {
            this.app.renderer.resize(currentWidth, targetHeight);
        }
        const canvasParent = this.app.canvas?.parentElement;
        if (canvasParent) {
            canvasParent.style.height = `${targetHeight}px`;
        }
    }
    getPausePeriods() {
        return this.pausePeriods;
    }
    getGraphRenderOptions() {
        return { ...this.graphRenderOptions };
    }
    setGraphRenderOptions(options, drawOptions) {
        this.graphRenderOptions = {
            ...this.graphRenderOptions,
            ...options,
        };
        this.xAxis.setGraphRenderOptions(this.graphRenderOptions);
        this.dataArea.setGraphRenderOptions(this.graphRenderOptions);
        if (drawOptions?.redraw !== false) {
            void this.draw();
        }
    }
    setProtocol(protocol) {
        hydrateProtocolItemsFromStringIfNeeded(protocol);
        this.protocol = protocol;
        if (this.yAxis) {
            this.yAxis.setProtocol(protocol);
        }
        if (this.dataArea) {
            this.dataArea.setProtocol(protocol);
        }
    }
    getObservablePreferences(observableId) {
        if (!this.protocol) {
            return null;
        }
        return getObservableGraphPreferences(observableId, this.protocol);
    }
    updateObservablePreference(observableId, preference, options) {
        if (!this.protocol) {
            return;
        }
        // Utilise _items en priorité (format frontend parsé) ou items (format mobile/core)
        const prot = this.protocol;
        const items = prot._items || prot.items || [];
        for (const category of items) {
            if (category.children) {
                const observable = category.children.find((o) => o.id === observableId);
                if (observable) {
                    if (!observable.graphPreferences) {
                        observable.graphPreferences = {};
                    }
                    Object.assign(observable.graphPreferences, preference);
                    if (options?.redraw !== false) {
                        void this.draw();
                    }
                    break;
                }
            }
        }
    }
    redrawCategory(categoryId) {
        if (this.axesGraphicsDirty) {
            void this.draw();
            return;
        }
        this.dataArea.redrawCategory(categoryId);
        this.requestRender();
    }
    redrawObservable(observableId) {
        if (this.axesGraphicsDirty) {
            void this.draw();
            return;
        }
        this.dataArea.redrawObservable(observableId);
        this.requestRender();
    }
    isDrawInProgress() {
        return this.drawInProgress;
    }
    /**
     * Renders only when the app is ready and no full draw/export is in flight.
     * If axis graphics were cleared and not yet redrawn, schedules a full draw
     * instead of painting the empty-axes scene (hover/pan must not "exclude" axes).
     */
    requestRender() {
        if (!this.isInitialized ||
            !this.app.renderer ||
            this.drawInProgress ||
            this.exportInProgress) {
            return;
        }
        if (this.axesGraphicsDirty) {
            void this.draw();
            return;
        }
        this.app.render();
    }
    draw() {
        return new Promise((resolve, reject) => {
            this.drawResolvers.push({ resolve, reject });
            if (this.drawRafId !== null) {
                return;
            }
            this.drawRafId = requestAnimationFrame(() => {
                this.drawRafId = null;
                const resolvers = this.drawResolvers;
                this.drawResolvers = [];
                // Wait for export OFF drawChain, then enqueue the body. Waiting for
                // exportQueue while already on drawChain deadlocks against export,
                // which must also enqueue bodies on the same chain.
                void (async () => {
                    try {
                        while (this.exportInProgress) {
                            await this.exportQueue;
                        }
                        await this.enqueueDrawBody();
                        resolvers.forEach((r) => r.resolve());
                    }
                    catch (error) {
                        resolvers.forEach((r) => r.reject(error));
                    }
                })();
            });
        });
    }
    /** Queues an exclusive full redraw on drawChain (used by draw + export). */
    enqueueDrawBody() {
        const done = this.drawChain.then(() => this.executeDrawBody(), () => this.executeDrawBody());
        // Keep drawChain healthy after a failure, but still reject `done` so callers
        // (and draw() promises) observe the error.
        this.drawChain = done.catch(() => undefined);
        return done;
    }
    async executeDrawBody() {
        // destroy() peut avoir annulé le rAF ; si executeDraw était déjà entré,
        // on sort avant de toucher plot/axes détruits.
        if (!this.isInitialized) {
            return;
        }
        this.drawInProgress = true;
        let succeeded = false;
        try {
            // Hide crosshair/label visuals only: keep any pending pointer event so
            // hover can resume on the next rAF after draw completes.
            this.dataArea.clearHoverOverlay({ cancelPending: false });
            if (this.needsPatternTextureRefresh) {
                // Detach sprites before destroying cached textures they still reference.
                this.dataArea.clearPatternSprites();
                clearPatternTextureCache();
                this.needsPatternTextureRefresh = false;
            }
            this.plot.x = 0;
            this.plot.y = 0;
            this.plot.scale.set(1);
            this.plot.rotation = 0;
            // Axis draw() clears graphics first — stay dirty until the full scene
            // has been rendered, so hover/pan cannot paint emptied axes.
            this.axesGraphicsDirty = true;
            this.yAxis.draw();
            this.xAxis.draw();
            this.dataArea.draw();
            if (this.isInteractive) {
                this.updateWorldBounds();
                this.recalculateFitViewport();
                if (this.needsInitialFit) {
                    this.needsInitialFit = false;
                    this.setViewportTransform({ ...this.fitViewport }, { skipRender: true });
                }
                else {
                    // Les bornes du plot peuvent avoir changé (protocole, relevés) sans
                    // reset volontaire du zoom : on reclamp la vue courante.
                    this.setViewportTransform({
                        scale: this.zoomState.scale,
                        x: this.zoomState.x,
                        y: this.zoomState.y,
                    }, { emitZoom: false, skipRender: true });
                }
            }
            else {
                this.updateWorldTransforms();
            }
            // Full draw must render explicitly here: requestRender() no-ops while
            // drawInProgress is true. Do not depend on the ticker alone.
            if (this.isInitialized && this.app.renderer) {
                this.app.render();
            }
            this.axesGraphicsDirty = false;
            succeeded = true;
        }
        catch (error) {
            // Axes/data clear at the start of draw. If we fail mid-way and then let
            // hover call requestRender(), the user sees empty axes + orphan crosshair.
            console.error('[PixiApp] Full draw failed:', error);
            this.axesGraphicsDirty = true;
            this.needsInitialFit = true;
            this.needsPatternTextureRefresh = true;
            this.dataArea.clearHoverOverlay();
            throw error;
        }
        finally {
            this.drawInProgress = false;
            if (succeeded) {
                this.dataArea.resumeHoverAfterDraw();
            }
        }
    }
    /**
     * Forces Pixi world matrices up to date after viewport pan/zoom.
     * Needed so hover `toGlobal`/`toLocal` (plot bounds, crosshair) stay correct.
     * Pixi 8: use getGlobalTransform() rather than a no-arg updateTransform().
     */
    updateWorldTransforms() {
        this.viewport.getGlobalTransform();
    }
    async clear() {
        this.yAxis.clear();
        this.xAxis.clear();
        this.dataArea.clear();
        this.axesGraphicsDirty = true;
    }
    getCanvasSize() {
        return {
            width: this.app.screen.width,
            height: this.app.screen.height,
        };
    }
    updateWorldBounds() {
        const height = this.yAxis.getRequiredHeight();
        const axisEnd = this.xAxis.getAxisEnd();
        const width = typeof axisEnd?.x === 'number' ? axisEnd.x + 20 : this.app.screen.width;
        this.worldBounds = {
            width: Math.max(1, width),
            height: Math.max(1, height),
        };
    }
    recalculateFitViewport() {
        const canvasSize = this.getCanvasSize();
        this.fitViewport = computeFitViewport(this.worldBounds, canvasSize, this.zoomState.minScale, this.zoomState.maxScale);
    }
    setViewportTransform(transform, options) {
        const scale = transform.scale ?? this.zoomState.scale;
        const clamped = clampViewport({
            scale,
            x: transform.x ?? this.viewport.x,
            y: transform.y ?? this.viewport.y,
        }, this.worldBounds, this.getCanvasSize());
        this.zoomState.scale = clamped.scale;
        this.zoomState.x = clamped.x;
        this.zoomState.y = clamped.y;
        this.viewport.scale.set(clamped.scale);
        this.viewport.x = clamped.x;
        this.viewport.y = clamped.y;
        this.updateWorldTransforms();
        if (options?.emitZoom !== false) {
            this.events.emit('zoom', clamped.scale);
            this.updateTimeScale();
        }
        // Gate via requestRender so a pan/zoom event cannot paint a mid-draw frame.
        if (!options?.skipRender) {
            this.requestRender();
        }
    }
    setupZoomAndPan() {
        this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_IDLE;
        if (!this.isInteractive) {
            this.app.canvas.style.touchAction = 'auto';
            return;
        }
        this.app.canvas.style.touchAction = 'none'; // Important pour mobile
        const wheelHandler = (evt) => {
            const target = evt.target;
            if (target && target.closest('.q-splitter__separator, .q-avatar')) {
                return;
            }
            evt.preventDefault();
            const rect = this.app.canvas.getBoundingClientRect();
            const mouseX = evt.clientX - rect.left;
            const mouseY = evt.clientY - rect.top;
            const worldPos = this.viewport.toLocal({ x: mouseX, y: mouseY });
            const zoomFactor = evt.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(this.zoomState.minScale, Math.min(this.zoomState.maxScale, this.zoomState.scale * zoomFactor));
            this.setViewportTransform({
                scale: newScale,
                x: mouseX - worldPos.x * newScale,
                y: mouseY - worldPos.y * newScale,
            });
        };
        // Support souris (desktop), touch et stylet pour mobile.
        // Un seul jeu d'écouteurs (Pointer Events) gère la souris ET le tactile :
        // ajouter aussi les écouteurs "mouse*" en parallèle faisait traiter deux
        // fois chaque mouvement pendant un glissé (double transform, double
        // rendu), d'où la sensation de saccade au clic-glissé.
        const pointerDownHandler = (evt) => {
            const target = evt.target;
            if (target && target.closest('.q-splitter__separator, .q-avatar')) {
                return;
            }
            if (evt.pointerType === 'touch') {
                this.zoomState.isPanning = true;
                this.zoomState.panStartX = evt.clientX - this.zoomState.x;
                this.zoomState.panStartY = evt.clientY - this.zoomState.y;
                this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_PANNING;
                evt.preventDefault();
            }
            else if (evt.pointerType === 'mouse' && evt.button === 0) {
                this.zoomState.isPanning = true;
                this.zoomState.panStartX = evt.clientX - this.zoomState.x;
                this.zoomState.panStartY = evt.clientY - this.zoomState.y;
                this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_PANNING;
                evt.preventDefault();
            }
        };
        const pointerMoveHandler = (evt) => {
            const target = evt.target;
            if (target && target.closest('.q-splitter__separator, .q-avatar')) {
                if (this.zoomState.isPanning) {
                    this.zoomState.isPanning = false;
                    this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_IDLE;
                }
                return;
            }
            if (this.zoomState.isPanning) {
                this.setViewportTransform({
                    x: evt.clientX - this.zoomState.panStartX,
                    y: evt.clientY - this.zoomState.panStartY,
                }, { emitZoom: false });
                evt.preventDefault();
            }
            else if (evt.pointerType === 'mouse') {
                this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_IDLE;
            }
        };
        const pointerUpHandler = (evt) => {
            if (evt.pointerType === 'touch' || evt.pointerType === 'mouse') {
                this.zoomState.isPanning = false;
                this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_IDLE;
                evt.preventDefault();
            }
        };
        const pointerLeaveHandler = () => {
            this.zoomState.isPanning = false;
            this.app.canvas.style.cursor = 'default';
        };
        // =========================================================================
        // TOUCH EVENTS - Pour le pinch-to-zoom et pan tactile
        // =========================================================================
        const getTouchDistance = (touch1, touch2) => {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };
        const getTouchCenter = (touch1, touch2) => {
            return {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2,
            };
        };
        const touchStartHandler = (evt) => {
            evt.preventDefault();
            if (evt.touches.length === 1) {
                // Un seul doigt = pan
                const touch = evt.touches[0];
                const rect = this.app.canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                this.zoomState.isPanning = true;
                this.zoomState.panStartX = touch.clientX - this.zoomState.x;
                this.zoomState.panStartY = touch.clientY - this.zoomState.y;
                this.zoomState.isPinching = false;
            }
            else if (evt.touches.length === 2) {
                // Deux doigts = pinch-to-zoom
                const touch1 = evt.touches[0];
                const touch2 = evt.touches[1];
                const distance = getTouchDistance(touch1, touch2);
                const center = getTouchCenter(touch1, touch2);
                const rect = this.app.canvas.getBoundingClientRect();
                this.zoomState.lastPinchDistance = distance;
                this.zoomState.lastPinchCenter = {
                    x: center.x - rect.left,
                    y: center.y - rect.top,
                };
                this.zoomState.isPinching = true;
                this.zoomState.isPanning = false;
            }
        };
        const touchMoveHandler = (evt) => {
            evt.preventDefault();
            if (evt.touches.length === 1 && this.zoomState.isPanning && !this.zoomState.isPinching) {
                // Pan avec un doigt
                const touch = evt.touches[0];
                this.setViewportTransform({
                    x: touch.clientX - this.zoomState.panStartX,
                    y: touch.clientY - this.zoomState.panStartY,
                }, { emitZoom: false });
            }
            else if (evt.touches.length === 2 && this.zoomState.isPinching) {
                // Pinch-to-zoom avec deux doigts
                const touch1 = evt.touches[0];
                const touch2 = evt.touches[1];
                const distance = getTouchDistance(touch1, touch2);
                const center = getTouchCenter(touch1, touch2);
                const rect = this.app.canvas.getBoundingClientRect();
                const centerX = center.x - rect.left;
                const centerY = center.y - rect.top;
                if (this.zoomState.lastPinchDistance > 0) {
                    const scaleChange = distance / this.zoomState.lastPinchDistance;
                    const newScale = Math.max(this.zoomState.minScale, Math.min(this.zoomState.maxScale, this.zoomState.scale * scaleChange));
                    // Convertir la position du centre en coordonnées monde
                    const worldPos = this.viewport.toLocal({ x: centerX, y: centerY });
                    this.setViewportTransform({
                        scale: newScale,
                        x: centerX - worldPos.x * newScale,
                        y: centerY - worldPos.y * newScale,
                    });
                }
                this.zoomState.lastPinchDistance = distance;
                this.zoomState.lastPinchCenter = { x: centerX, y: centerY };
            }
        };
        const touchEndHandler = (evt) => {
            evt.preventDefault();
            if (evt.touches.length === 0) {
                // Tous les doigts levés
                this.zoomState.isPanning = false;
                this.zoomState.isPinching = false;
                this.zoomState.lastPinchDistance = 0;
            }
            else if (evt.touches.length === 1) {
                // Passage de 2 doigts à 1 doigt = passer en mode pan
                const touch = evt.touches[0];
                this.zoomState.isPanning = true;
                this.zoomState.isPinching = false;
                this.zoomState.panStartX = touch.clientX - this.zoomState.x;
                this.zoomState.panStartY = touch.clientY - this.zoomState.y;
                this.zoomState.lastPinchDistance = 0;
            }
        };
        this.app.canvas.addEventListener('wheel', wheelHandler, { passive: false });
        // Pointer events (couvrent souris, tactile et stylet en un seul chemin)
        this.app.canvas.addEventListener('pointerdown', pointerDownHandler);
        this.app.canvas.addEventListener('pointermove', pointerMoveHandler);
        this.app.canvas.addEventListener('pointerup', pointerUpHandler);
        this.app.canvas.addEventListener('pointercancel', pointerUpHandler);
        this.app.canvas.addEventListener('pointerleave', pointerLeaveHandler);
        // Touch events (mobile) — pour le pinch-to-zoom, non couvert par Pointer Events
        this.app.canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
        this.app.canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
        this.app.canvas.addEventListener('touchend', touchEndHandler, { passive: false });
        this.app.canvas.addEventListener('touchcancel', touchEndHandler, { passive: false });
        this.app.canvas._zoomPanHandlers = {
            wheel: wheelHandler,
            pointerdown: pointerDownHandler,
            pointermove: pointerMoveHandler,
            pointerup: pointerUpHandler,
            pointercancel: pointerUpHandler,
            pointerleave: pointerLeaveHandler,
            touchstart: touchStartHandler,
            touchmove: touchMoveHandler,
            touchend: touchEndHandler,
            touchcancel: touchEndHandler,
        };
    }
    updateTimeScale() {
        // Future: implémenter l'ajustement dynamique des graduations
    }
    zoomIn() {
        if (!this.isInteractive)
            return;
        // Utiliser le centre de l'écran visible (viewport) plutôt que le centre du canvas bitmap
        const rect = this.app.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const worldPos = this.viewport.toLocal({ x: centerX, y: centerY });
        const newScale = Math.min(this.zoomState.maxScale, this.zoomState.scale * 1.2);
        this.setViewportTransform({
            scale: newScale,
            x: centerX - worldPos.x * newScale,
            y: centerY - worldPos.y * newScale,
        });
    }
    zoomOut() {
        if (!this.isInteractive)
            return;
        // Utiliser le centre de l'écran visible (viewport) plutôt que le centre du canvas bitmap
        const rect = this.app.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const worldPos = this.viewport.toLocal({ x: centerX, y: centerY });
        const newScale = Math.max(this.zoomState.minScale, this.zoomState.scale * 0.8);
        this.setViewportTransform({
            scale: newScale,
            x: centerX - worldPos.x * newScale,
            y: centerY - worldPos.y * newScale,
        });
    }
    resetView() {
        if (!this.isInteractive) {
            return Promise.resolve();
        }
        this.needsInitialFit = true;
        return this.draw();
    }
    getZoomLevel() {
        return this.zoomState.scale;
    }
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
    async exportAsImage(format = 'png', quality = 0.92) {
        const task = this.exportQueue.then(() => this.runExportAsImage(format, quality));
        this.exportQueue = task.then(() => undefined, () => undefined);
        return task;
    }
    async runExportAsImage(format, quality) {
        if (!this.app.canvas || !this.isInitialized || !this.app.renderer) {
            return null;
        }
        this.exportInProgress = true;
        this.dataArea.setHoverOverlaySuppressed(true);
        this.dataArea.clearHoverOverlay();
        const originalWidth = this.app.screen.width;
        const originalHeight = this.app.screen.height;
        const requiredHeight = this.yAxis.getRequiredHeight();
        const exportHeight = Math.max(originalHeight, requiredHeight);
        const savedViewport = {
            scale: this.zoomState.scale,
            x: this.zoomState.x,
            y: this.zoomState.y,
        };
        let resizedForExport = false;
        try {
            if (this.isInteractive) {
                if (exportHeight !== originalHeight) {
                    this.app.renderer.resize(originalWidth, exportHeight);
                    resizedForExport = true;
                }
                this.updateWorldBounds();
                const exportCanvasSize = {
                    width: originalWidth,
                    height: exportHeight,
                };
                const fitViewport = computeFitViewport(this.worldBounds, exportCanvasSize, this.zoomState.minScale, this.zoomState.maxScale);
                this.setViewportTransform(fitViewport, { emitZoom: false, skipRender: true });
            }
            // Direct enqueue (not draw()): avoids deadlock with external draws that
            // wait on exportQueue off-chain before enqueueing.
            await this.enqueueDrawBody();
            this.app.render();
            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            return this.app.canvas.toDataURL(mimeType, quality);
        }
        finally {
            try {
                if (this.isInteractive) {
                    if (resizedForExport) {
                        this.app.renderer.resize(originalWidth, originalHeight);
                        this.updateWorldBounds();
                        this.recalculateFitViewport();
                    }
                    this.setViewportTransform(savedViewport, { emitZoom: false, skipRender: true });
                    await this.enqueueDrawBody();
                }
            }
            finally {
                this.exportInProgress = false;
                this.dataArea.setHoverOverlaySuppressed(false);
            }
        }
    }
    destroy() {
        this.isInitialized = false;
        if (this.drawRafId !== null) {
            cancelAnimationFrame(this.drawRafId);
            this.drawRafId = null;
        }
        const pendingResolvers = this.drawResolvers;
        this.drawResolvers = [];
        pendingResolvers.forEach((r) => r.resolve());
        this.teardownContextHandlers?.();
        if (this.dataArea) {
            this.dataArea.clearHoverOverlay();
        }
        if (this.app.canvas && this.app.canvas._zoomPanHandlers) {
            const handlers = this.app.canvas._zoomPanHandlers;
            this.app.canvas.removeEventListener('wheel', handlers.wheel);
            this.app.canvas.removeEventListener('pointerdown', handlers.pointerdown);
            this.app.canvas.removeEventListener('pointermove', handlers.pointermove);
            this.app.canvas.removeEventListener('pointerup', handlers.pointerup);
            this.app.canvas.removeEventListener('pointercancel', handlers.pointercancel);
            this.app.canvas.removeEventListener('pointerleave', handlers.pointerleave);
            this.app.canvas.removeEventListener('touchstart', handlers.touchstart);
            this.app.canvas.removeEventListener('touchmove', handlers.touchmove);
            this.app.canvas.removeEventListener('touchend', handlers.touchend);
            this.app.canvas.removeEventListener('touchcancel', handlers.touchcancel);
        }
        this.events.removeAllListeners();
        clearPatternTextureCache();
        this.app.destroy();
    }
}
//# sourceMappingURL=index.js.map