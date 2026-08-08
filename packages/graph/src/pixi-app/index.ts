import { Application, Container, EventEmitter } from 'pixi.js';
import { xAxis } from './axis/x-axis';
import { YAxis } from './axis/y-axis';
import { DataArea } from './data-area';
import type { IObservation, IProtocol, IGraphPreferences, IProtocolItem, IPeriod } from '@actograph/core';
import { filterReadingsForGraphDisplay } from '@actograph/core';
import { getGraphPausePeriods } from '../utils/pause-periods.utils';
import { getObservableGraphPreferences, hydrateProtocolItemsFromStringIfNeeded } from '../utils/protocol.utils';
import { clearPatternTextureCache } from '../lib/pattern-textures';
import {
  clampViewport,
  computeFitViewport,
  isDegenerateCanvasSize,
  preserveViewportOnResize,
  type ViewportState,
  type WorldBounds,
} from '../utils/viewport.utils';
import type { IGraphRenderOptions } from '../types/graph-render-options';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../types/graph-render-options';
import {
  GRAPH_CANVAS_CURSOR_IDLE,
  GRAPH_CANVAS_CURSOR_PANNING,
} from '../utils/graph-cursor.constants';
import {
  canPaintPartial,
  isAuthoritativePaintReason,
  shouldScheduleDrawOnPaintGate,
  type PaintReason,
  type ScenePaintState,
} from '../utils/scene-paint.utils';

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
export class PixiApp {
  private app: Application;
  private viewport!: Container;
  private plot!: Container;
  private xAxis!: xAxis;
  private yAxis!: YAxis;
  private dataArea!: DataArea;
  private protocol: IProtocol | null = null;
  private isInteractive = true;
  private baseCanvasHeight = 0;
  private teardownContextHandlers: (() => void) | null = null;
  /**
   * True only once `init()` a fini de créer le renderer PixiJS.
   * En v8, `app.canvas` lit `renderer.canvas` : y accéder avant init (ou après
   * destroy) lève "Cannot read properties of undefined (reading 'canvas')".
   */
  private isInitialized = false;
  private worldBounds: WorldBounds = { width: 1, height: 1 };
  private fitViewport: ViewportState = { scaleX: 1, scaleY: 1, x: 0, y: 0 };
  private needsInitialFit = false;
  private pausePeriods: IPeriod[] = [];
  private graphRenderOptions: IGraphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };
  private exportInProgress = false;
  private exportQueue: Promise<unknown> = Promise.resolve();
  private drawRafId: number | null = null;
  private drawResolvers: Array<{
    resolve: () => void;
    reject: (reason?: unknown) => void;
  }> = [];
  private drawInProgress = false;
  /**
   * True from the moment `draw()` is requested until its async dispatch
   * (rAF → wait export → drawChain → executeDrawBody) has fully settled.
   * Closes the gap where drawRafId/resolvers are already cleared but
   * executeDrawBody has not yet set drawInProgress/mutating — a window that
   * previously allowed hover to paint.
   */
  private drawDispatchActive = false;
  /**
   * Serializes executeDrawBody. Must never await exportQueue while a caller is
   * already on this chain (deadlock with export). External draw() waits for
   * export OFF-chain, then enqueues the body.
   */
  private drawChain: Promise<void> = Promise.resolve();
  private lastObservation: IObservation | null = null;
  private wasDegenerateCanvas = false;
  /** When true, executeDraw clears pattern textures after detaching sprites. */
  private needsPatternTextureRefresh = false;
  /**
   * After WebGL context loss, cached pattern textures hold dead GPU resources
   * even if no sprites remain on stage; force a full cache clear on next draw.
   */
  private forcePatternTextureClear = false;
  /**
   * Scene paint contract (see `paint()`):
   * - stable: coherent scene, partial paints (hover/pan/…) allowed
   * - mutating: full draw clearing/rebuilding, partial paints forbidden
   * - failed: last draw failed, partial paints forbidden until a successful draw
   *
   * Replaces the old axesGraphicsDirty boolean with an explicit lifecycle.
   */
  private scenePaintState: ScenePaintState = 'failed';
  /**
   * Coalesced catch-up: any number of refused partial paints while unstable
   * collapse to a single flag. Flushed once when the scene is stable again
   * (either consumed by draw-complete, or one paint('partial') after dispatch).
   */
  private pendingPartialPaint = false;
  /**
   * Guards against a hover-driven draw storm: one recovery draw per bad-scene
   * episode, released by the next `paint('draw-complete')`.
   */
  private recoveryDrawScheduled = false;
  /**
   * When false, hover/leave/pan cannot paint (Observation→Graphe remount race:
   * layout resize often arms DRAW#2 after the first OK frame; hover must wait
   * until the host re-enables after a settled draw).
   */
  private partialPaintsEnabled = true;
  private contextRestoring = false;
  private contextRestoreOuterRafId: number | null = null;
  private contextRestoreInnerRafId: number | null = null;

  /** Émetteur d'événements pour notifier les changements d'état (ex: zoom) */
  public events = new EventEmitter();

  private zoomState = {
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

  /**
   * Multiplicateurs d'étirement par axe, appliqués par-dessus zoomState.scale.
   * Indépendants du zoom pan/molette/+- (qui reste uniforme) : permettent
   * d'étirer le temps (x) et de compacter les catégories (y) séparément.
   */
  private axisStretch = {
    x: 1,
    y: 1,
    minStretch: 0.25,
    maxStretch: 4,
  };

  constructor() {
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
  async init(options: IPixiAppInitOptions) {
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
      resolution: dpr,      // Pour les écrans HiDPI
      autoDensity: true,    // Ajuste automatiquement la densité
      preserveDrawingBuffer: true, // Required for canvas.toDataURL() to produce non-black exports
      // Explicit paints only: the default ticker would call app.render() every
      // frame and bypass the scenePaintState contract in paint().
      autoStart: false,
      // ⚠️ PAS DE resizeTo - on contrôle les dimensions manuellement via DCanvas
      // Utiliser resizeTo causerait des conflits avec notre gestion des dimensions
    });
    this.app.ticker.stop();

    this.yAxis = new YAxis(this.app);
    this.xAxis = new xAxis(this.app, this.yAxis);
    this.dataArea = new DataArea(this.app, this.yAxis, this.xAxis, {
      interactive: this.isInteractive,
    });
    this.dataArea.setDrawStateCallbacks({
      isDrawInProgress: () => this.isDrawInProgress(),
      isDrawPipelineBusy: () => this.isDrawPipelineBusy(),
      isSceneStable: () => this.isSceneStableForPartialPaint(),
      requestPaint: (reason) => this.paint(reason),
      requestFullDraw: () => this.requestRecoveryDraw('hoverGate'),
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

    // Premier paint : fond blanc pour effacer le buffer WebGL (noir). La scène
    // reste FAILED jusqu'au premier draw complet, donc aucun survol ne peut
    // peindre ce vide.
    this.paint('init');
  }

  /**
   * Resize the renderer to match the current CSS size of the canvas element.
   * @param options.skipRender - When true, updates layout/viewport without painting
   *   (caller should follow with a single `draw()`).
   */
  public resizeFromCanvas(options?: { skipRender?: boolean }): boolean {
    // Le renderer n'existe pas tant que init() n'a pas abouti (ou après destroy).
    // Accéder à app.canvas/renderer avant cela lèverait une exception.
    if (!this.isInitialized || !this.app.renderer || this.exportInProgress) {
      return false;
    }

    const canvas = this.app.canvas as HTMLCanvasElement | null;
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
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width > maxWidth ||
      height > maxHeight
    ) {
      return false;
    }

    this.app.renderer.resize(width, height);
    if (this.isInteractive) {
      this.updateWorldBounds();
      this.recalculateFitViewport();
      const clamped = preserveViewportOnResize(
        {
          scaleX: this.zoomState.scale * this.axisStretch.x,
          scaleY: this.zoomState.scale * this.axisStretch.y,
          x: this.viewport.x,
          y: this.viewport.y,
        },
        this.worldBounds,
        this.getCanvasSize(),
      );
      this.setViewportTransform(
        { scale: this.zoomState.scale, x: clamped.x, y: clamped.y },
        {
          emitZoom: false,
          skipRender: options?.skipRender,
        },
      );
    } else if (!options?.skipRender) {
      this.paint('resize');
    }
    return true;
  }

  /**
   * Clears hover and marks pattern textures stale before a visibility resume refresh.
   * Forces initial fit so axes cannot stay off-canvas after a bad viewport preserved
   * across tab hide/show.
   */
  public prepareForResumeRefresh(): void {
    this.setPartialPaintsEnabled(false);
    this.dataArea.clearHoverOverlay({ skipPaint: true });
    this.needsPatternTextureRefresh = true;
    // Always re-fit on resume: preserving zoom across a hidden tab often leaves
    // the camera on an empty region (axes "disappeared", one data fragment left).
    this.needsInitialFit = true;
    this.wasDegenerateCanvas = true;
    this.markDegenerateCanvasIfNeeded();
  }

  private cancelContextRestoreRafs(): void {
    if (this.contextRestoreOuterRafId !== null) {
      cancelAnimationFrame(this.contextRestoreOuterRafId);
      this.contextRestoreOuterRafId = null;
    }
    if (this.contextRestoreInnerRafId !== null) {
      cancelAnimationFrame(this.contextRestoreInnerRafId);
      this.contextRestoreInnerRafId = null;
    }
  }

  /**
   * Refresh rendering after window resize, visibility resume, or WebGL context restore.
   */
  public refreshAfterResume(): void {
    if (!this.isInitialized || this.contextRestoring) {
      return;
    }
    this.dataArea.clearHoverOverlay({ skipPaint: true });
    this.needsPatternTextureRefresh = true;
    this.needsInitialFit = true;
    this.wasDegenerateCanvas = true;
    if (this.lastObservation) {
      this.reapplyLastObservation();
    }
    this.markDegenerateCanvasIfNeeded();
    this.resizeFromCanvas({ skipRender: true });
    this.scheduleDraw('resume');
  }

  /**
   * Resolves when all in-flight draws and exports have finished.
   */
  public waitForIdle(): Promise<void> {
    const exportGate = this.exportInProgress ? this.exportQueue : Promise.resolve();
    return Promise.all([this.drawChain, exportGate]).then(() => undefined);
  }

  private markDegenerateCanvasIfNeeded(): void {
    const canvas = this.app.canvas as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (isDegenerateCanvasSize(rect.width, rect.height)) {
      this.wasDegenerateCanvas = true;
    }
  }

  private reapplyLastObservation(): void {
    if (!this.lastObservation) {
      return;
    }
    this.setData(this.lastObservation);
  }

  private bindWebGLContextHandlers(): void {
    const canvas = this.app.canvas as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    const onContextLost = (event: Event) => {
      event.preventDefault();
      this.contextRestoring = true;
      // Cancel any restore refresh already queued: a re-loss before the
      // deferred resume must not run resize/draw on a dead GL context.
      this.cancelContextRestoreRafs();
      this.dataArea.clearHoverOverlay({ skipPaint: true });
      this.needsPatternTextureRefresh = true;
      this.forcePatternTextureClear = true;
      this.scenePaintState = 'failed';
      // Force fit after restore: GPU context loss often coincides with a bad
      // or stale viewport even when CSS size still looks valid.
      this.wasDegenerateCanvas = true;
    };
    const onContextRestored = () => {
      // Defer until the browser has recreated the GL context and canvas layout.
      this.cancelContextRestoreRafs();
      this.contextRestoreOuterRafId = requestAnimationFrame(() => {
        this.contextRestoreOuterRafId = null;
        this.contextRestoreInnerRafId = requestAnimationFrame(() => {
          this.contextRestoreInnerRafId = null;
          if (!this.isInitialized) {
            return;
          }
          this.contextRestoring = false;
          this.refreshAfterResume();
        });
      });
    };

    canvas.addEventListener('webglcontextlost', onContextLost, false);
    canvas.addEventListener('webglcontextrestored', onContextRestored, false);

    this.teardownContextHandlers = () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      this.teardownContextHandlers = null;
    };
  }

  public setData(observation: IObservation) {
    if (!observation.readings) {
      throw new Error('Observation must have readings');
    }
    if (!observation.protocol) {
      throw new Error('Observation must have protocol');
    }

    this.protocol = observation.protocol;
    this.dataArea.setProtocol(observation.protocol);

    const graphObservation: IObservation = {
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
    const requiredHeight = this.getRequiredCanvasHeight();
    const currentWidth = this.app.screen.width;
    const currentHeight = this.app.screen.height;
    const targetHeight = Math.max(this.baseCanvasHeight, requiredHeight);
    if (targetHeight !== currentHeight) {
      this.app.renderer.resize(currentWidth, targetHeight);
    }

    const canvasParent = this.app.canvas?.parentElement as HTMLElement | null;
    if (canvasParent) {
      canvasParent.style.height = `${targetHeight}px`;
    }
  }

  public getPausePeriods(): IPeriod[] {
    return this.pausePeriods;
  }

  public getGraphRenderOptions(): IGraphRenderOptions {
    return { ...this.graphRenderOptions };
  }

  public setGraphRenderOptions(
    options: Partial<IGraphRenderOptions>,
    drawOptions?: { redraw?: boolean },
  ): void {
    this.graphRenderOptions = {
      ...this.graphRenderOptions,
      ...options,
    };
    this.xAxis.setGraphRenderOptions(this.graphRenderOptions);
    this.dataArea.setGraphRenderOptions(this.graphRenderOptions);
    if (drawOptions?.redraw !== false) {
      this.scheduleDraw('renderOptions');
    }
  }

  public setProtocol(protocol: IProtocol) {
    hydrateProtocolItemsFromStringIfNeeded(protocol);

    this.protocol = protocol;

    if (this.yAxis) {
      this.yAxis.setProtocol(protocol);
    }
    if (this.dataArea) {
      this.dataArea.setProtocol(protocol);
    }
  }

  public getObservablePreferences(observableId: string): IGraphPreferences | null {
    if (!this.protocol) {
      return null;
    }
    return getObservableGraphPreferences(observableId, this.protocol);
  }

  public updateObservablePreference(
    observableId: string,
    preference: Partial<IGraphPreferences>,
    options?: { redraw?: boolean },
  ) {
    if (!this.protocol) {
      return;
    }

    // Utilise _items en priorité (format frontend parsé) ou items (format mobile/core)
    const prot = this.protocol as any;
    const items = prot._items || prot.items || [];
    for (const category of items) {
      if (category.children) {
        const observable = category.children.find((o: IProtocolItem) => o.id === observableId);
        if (observable) {
          if (!observable.graphPreferences) {
            observable.graphPreferences = {};
          }
          Object.assign(observable.graphPreferences, preference);
          if (options?.redraw !== false) {
            this.scheduleDraw('observablePref');
          }
          break;
        }
      }
    }
  }

  public redrawCategory(categoryId: string): void {
    if (this.scenePaintState !== 'stable') {
      this.scheduleDraw('redrawCategory');
      return;
    }
    this.dataArea.redrawCategory(categoryId);
    this.paint('partial');
  }

  public redrawObservable(observableId: string): void {
    if (this.scenePaintState !== 'stable') {
      this.scheduleDraw('redrawObservable');
      return;
    }
    this.dataArea.redrawObservable(observableId);
    this.paint('partial');
  }

  public isDrawInProgress(): boolean {
    return this.drawInProgress;
  }

  /** True when a full draw is queued, dispatching, or executing. */
  private isDrawPipelineBusy(): boolean {
    return (
      this.drawDispatchActive ||
      this.drawInProgress ||
      this.drawRafId !== null ||
      this.drawResolvers.length > 0
    );
  }

  /** Partial paints require a coherent scene, idle pipeline, and host enable. */
  private isSceneStableForPartialPaint(): boolean {
    return (
      this.partialPaintsEnabled &&
      this.scenePaintState === 'stable' &&
      !this.isDrawPipelineBusy()
    );
  }

  /**
   * Gate hover/pan paints during remount or resume until layout + draw settle.
   * Authoritative paints (draw-complete) are unaffected.
   */
  public setPartialPaintsEnabled(enabled: boolean): void {
    this.partialPaintsEnabled = enabled;
    if (!enabled) {
      this.dataArea?.clearHoverOverlay({ skipPaint: true });
    } else {
      this.flushPendingPartialPaint();
    }
  }

  public arePartialPaintsEnabled(): boolean {
    return this.partialPaintsEnabled;
  }

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
  public paint(reason: PaintReason): boolean {
    if (!this.isInitialized || !this.app.renderer) {
      return false;
    }
    if (
      this.exportInProgress &&
      reason !== 'export' &&
      reason !== 'draw-complete'
    ) {
      if (!isAuthoritativePaintReason(reason)) {
        this.pendingPartialPaint = true;
      }
      return false;
    }

    if (!isAuthoritativePaintReason(reason)) {
      if (!this.partialPaintsEnabled) {
        this.pendingPartialPaint = true;
        return false;
      }
      const drawQueued = this.isDrawPipelineBusy();
      if (
        !canPaintPartial({
          scenePaintState: this.scenePaintState,
          drawInProgress: this.drawInProgress,
          exportInProgress: this.exportInProgress,
          drawQueued,
        })
      ) {
        // Coalesce: many refused partial paints → one pending catch-up.
        this.pendingPartialPaint = true;
        // Recovery draw is armed at most ONCE per bad-scene episode. Re-arming
        // on every refused pointermove kept the pipeline permanently busy, so
        // no draw ever settled and the scene never went back to STABLE.
        if (
          shouldScheduleDrawOnPaintGate(reason) &&
          this.scenePaintState !== 'stable' &&
          !this.recoveryDrawScheduled &&
          !this.isDrawPipelineBusy()
        ) {
          this.recoveryDrawScheduled = true;
          this.scheduleDraw(`paintGate:${reason}`);
        }
        return false;
      }
    }

    this.app.render();
    // Only a completed full draw proves the scene holds coherent content.
    // `init` paints the white background over an EMPTY scene: marking it stable
    // would let a pointermove paint "crosshair only" before the first draw.
    if (reason === 'draw-complete') {
      this.scenePaintState = 'stable';
      this.recoveryDrawScheduled = false;
      // Authoritative frame already matches the scene (hover cleared at draw
      // start; viewport applied before paint). Consume the queue without a
      // second render.
      this.pendingPartialPaint = false;
    } else if (!isAuthoritativePaintReason(reason)) {
      this.pendingPartialPaint = false;
    }
    return true;
  }

  /**
   * Arms at most one full draw to recover an incoherent scene. Callers on the
   * pointermove path must go through here: an unguarded scheduleDraw per frame
   * kept the pipeline busy forever and the scene never returned to STABLE.
   */
  private requestRecoveryDraw(reason: string): void {
    if (this.recoveryDrawScheduled || this.isDrawPipelineBusy()) {
      return;
    }
    this.recoveryDrawScheduled = true;
    this.scheduleDraw(reason);
  }

  /**
   * If partial paints were refused while unstable, run at most one catch-up
   * paint now that the scene is stable and the draw pipeline is idle.
   * `paint('partial')` clears the pending flag on success; on refusal it stays
   * set for a later flush.
   */
  private flushPendingPartialPaint(): void {
    if (!this.pendingPartialPaint) {
      return;
    }
    if (!this.isSceneStableForPartialPaint() || this.exportInProgress) {
      return;
    }
    this.paint('partial');
  }

  /**
   * @deprecated Prefer `paint(reason)`. Kept as a thin alias for pan/zoom paths
   * that do not distinguish pan vs zoom at the call site.
   */
  public requestRender(): void {
    this.paint('pan');
  }

  private scheduleDraw(reason?: string): void {
    if (!this.isInitialized) {
      return;
    }
    this.draw().catch((error) => {
      console.warn(`[PixiApp] scheduleDraw failed (${reason ?? 'unknown'}):`, error);
    });
  }

  public draw(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.drawResolvers.push({ resolve, reject });
      // Arm immediately so hover/pan cannot partial-paint during the async gap
      // between this call and executeDrawBody (rAF + export wait + drawChain).
      this.drawDispatchActive = true;
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
          } catch (error) {
            resolvers.forEach((r) => r.reject(error));
          } finally {
            // A newer draw() may have re-armed the pipeline while we ran.
            if (this.drawRafId === null && this.drawResolvers.length === 0) {
              this.drawDispatchActive = false;
              // Early-return draws never reach paint('draw-complete'); if partial
              // paints piled up as pending, flush exactly one now that we are idle.
              this.flushPendingPartialPaint();
            }
          }
        })();
      });
    });
  }

  /** Queues an exclusive full redraw on drawChain (used by draw + export). */
  private enqueueDrawBody(): Promise<void> {
    const done = this.drawChain.then(
      () => this.executeDrawBody(),
      () => this.executeDrawBody(),
    );
    // Keep drawChain healthy after a failure, but still reject `done` so callers
    // (and draw() promises) observe the error.
    this.drawChain = done.catch(() => undefined);
    return done;
  }

  private async executeDrawBody() {
    // destroy() peut avoir annulé le rAF ; si executeDraw était déjà entré,
    // on sort avant de toucher plot/axes détruits.
    if (!this.isInitialized) {
      return;
    }
    if (this.contextRestoring) {
      return;
    }
    if (!this.app.renderer) {
      return;
    }

    this.drawInProgress = true;
    // Mark scene mutating before any clear/rebuild so paint('hover'|'leave'|…)
    // cannot flush a preserveDrawingBuffer frame of emptied axes.
    this.scenePaintState = 'mutating';
    try {
      // Drop any pending hover: resuming it after a full draw was racing with
      // remount DRAW#2 (resize/watch) and painting emptied axes over a stale
      // preserveDrawingBuffer frame on the next pointermove.
      this.dataArea.clearHoverOverlay({ cancelPending: true, skipPaint: true });

      if (this.needsPatternTextureRefresh) {
        const hadPatterns = this.dataArea.hasPatternSprites();
        this.dataArea.clearPatternSprites();
        // Skip cache destroy in Normal (no pattern sprites) unless WebGL
        // context loss left dead GPU textures in the shared module cache.
        if (hadPatterns || this.forcePatternTextureClear) {
          clearPatternTextureCache();
          this.forcePatternTextureClear = false;
        }
        this.needsPatternTextureRefresh = false;
      }

      this.plot.x = 0;
      this.plot.y = 0;
      this.plot.scale.set(1);
      this.plot.rotation = 0;

      this.yAxis.draw();
      this.xAxis.draw();
      this.dataArea.draw();

      if (this.isInteractive) {
        this.updateWorldBounds();
        this.recalculateFitViewport();
        if (this.needsInitialFit) {
          this.needsInitialFit = false;
          this.setViewportTransform(
            { scale: this.fitViewport.scaleX, x: this.fitViewport.x, y: this.fitViewport.y },
            { skipRender: true },
          );
        } else {
          // Les bornes du plot peuvent avoir changé (protocole, relevés) sans
          // reset volontaire du zoom : on reclamp la vue courante.
          this.setViewportTransform(
            {
              scale: this.zoomState.scale,
              x: this.zoomState.x,
              y: this.zoomState.y,
            },
            { emitZoom: false, skipRender: true },
          );
        }
      } else {
        this.updateWorldTransforms();
      }

      // Authoritative paint: the only safe moment to leave MUTATING → STABLE.
      if (!this.isInitialized || !this.app.renderer) {
        throw new Error('PixiApp renderer unavailable at end of draw');
      }
      this.paint('draw-complete');
    } catch (error) {
      // Axes/data clear at the start of draw. Stay FAILED so hover/pan cannot
      // paint emptied axes + orphan crosshair.
      console.error('[PixiApp] Full draw failed:', error);
      this.scenePaintState = 'failed';
      this.needsInitialFit = true;
      this.needsPatternTextureRefresh = true;
      this.dataArea.clearHoverOverlay({ cancelPending: true, skipPaint: true });
      throw error;
    } finally {
      this.drawInProgress = false;
      // Do not resumeHoverAfterDraw: user must move again after a full redraw.
    }
  }

  /**
   * Forces Pixi world matrices up to date after viewport pan/zoom.
   * Needed so hover `toGlobal`/`toLocal` (plot bounds, crosshair) stay correct.
   * Pixi 8: use getGlobalTransform() rather than a no-arg updateTransform().
   */
  private updateWorldTransforms(): void {
    this.viewport.getGlobalTransform();
  }

  public async clear() {
    this.scenePaintState = 'mutating';
    this.yAxis.clear();
    this.xAxis.clear();
    this.dataArea.clear();
    this.scenePaintState = 'failed';
  }

  private getCanvasSize(): { width: number; height: number } {
    return {
      width: this.app.screen.width,
      height: this.app.screen.height,
    };
  }

  /**
   * Hauteur totale requise pour un rendu hors-écran complet (export, mobile),
   * en tenant compte de la marge réelle nécessaire sous l'axe X pour les
   * labels inclinés à 45° (peut dépasser largement les 20px fixes de
   * `YAxis.getRequiredHeight()` selon le format de temps choisi, ex. "Full").
   */
  private getRequiredCanvasHeight(): number {
    const axisStartY = this.yAxis.getAxisStartY();
    const xAxisBottomMargin = this.xAxis.getRequiredBottomMargin();
    return Math.max(this.yAxis.getRequiredHeight(), axisStartY + xAxisBottomMargin);
  }

  private updateWorldBounds(): void {
    const height = this.yAxis.getRequiredHeight();
    const axisEnd = this.xAxis.getAxisEnd();
    const width =
      typeof axisEnd?.x === 'number' ? axisEnd.x + 20 : this.app.screen.width;

    this.worldBounds = {
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  }

  private recalculateFitViewport(): void {
    const canvasSize = this.getCanvasSize();
    this.fitViewport = computeFitViewport(
      this.worldBounds,
      canvasSize,
      this.zoomState.minScale,
      this.zoomState.maxScale,
    );
  }

  private setViewportTransform(
    transform: { scale?: number; x?: number; y?: number },
    options?: { emitZoom?: boolean; skipRender?: boolean },
  ): void {
    const baseScale = transform.scale ?? this.zoomState.scale;
    const clamped = clampViewport(
      {
        scaleX: baseScale * this.axisStretch.x,
        scaleY: baseScale * this.axisStretch.y,
        x: transform.x ?? this.viewport.x,
        y: transform.y ?? this.viewport.y,
      },
      this.worldBounds,
      this.getCanvasSize(),
    );

    this.zoomState.scale = baseScale;
    this.zoomState.x = clamped.x;
    this.zoomState.y = clamped.y;
    this.viewport.scale.set(clamped.scaleX, clamped.scaleY);
    this.viewport.x = clamped.x;
    this.viewport.y = clamped.y;
    this.updateWorldTransforms();

    if (options?.emitZoom !== false) {
      this.events.emit('zoom', baseScale);
      this.updateTimeScale();
    }

    // Gate via paint() so a pan/zoom event cannot flush a mid-draw frame.
    if (!options?.skipRender) {
      this.paint('pan');
    }
  }

  private setupZoomAndPan() {
    this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_IDLE;
    if (!this.isInteractive) {
      this.app.canvas.style.touchAction = 'auto';
      return;
    }
    this.app.canvas.style.touchAction = 'none'; // Important pour mobile

    const wheelHandler = (evt: WheelEvent) => {
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        return;
      }

      evt.preventDefault();

      const rect = this.app.canvas.getBoundingClientRect();
      const mouseX = evt.clientX - rect.left;
      const mouseY = evt.clientY - rect.top;

      const worldPos = this.viewport.toLocal({ x: mouseX, y: mouseY } as any);

      const zoomFactor = evt.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(
        this.zoomState.minScale,
        Math.min(this.zoomState.maxScale, this.zoomState.scale * zoomFactor)
      );

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
    const pointerDownHandler = (evt: PointerEvent) => {
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        return;
      }

      if (evt.pointerType === 'touch') {
        this.zoomState.isPanning = true;
        this.zoomState.panStartX = evt.clientX - this.zoomState.x;
        this.zoomState.panStartY = evt.clientY - this.zoomState.y;
        this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_PANNING;
        evt.preventDefault();
      } else if (evt.pointerType === 'mouse' && evt.button === 0) {
        this.zoomState.isPanning = true;
        this.zoomState.panStartX = evt.clientX - this.zoomState.x;
        this.zoomState.panStartY = evt.clientY - this.zoomState.y;
        this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_PANNING;
        evt.preventDefault();
      }
    };

    const pointerMoveHandler = (evt: PointerEvent) => {
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        if (this.zoomState.isPanning) {
          this.zoomState.isPanning = false;
          this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_IDLE;
        }
        return;
      }

      if (this.zoomState.isPanning) {
        this.setViewportTransform(
          {
            x: evt.clientX - this.zoomState.panStartX,
            y: evt.clientY - this.zoomState.panStartY,
          },
          { emitZoom: false },
        );
        evt.preventDefault();
      } else if (evt.pointerType === 'mouse') {
        this.app.canvas.style.cursor = GRAPH_CANVAS_CURSOR_IDLE;
      }
    };

    const pointerUpHandler = (evt: PointerEvent) => {
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
    
    const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    };

    const touchStartHandler = (evt: TouchEvent) => {
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
      } else if (evt.touches.length === 2) {
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

    const touchMoveHandler = (evt: TouchEvent) => {
      evt.preventDefault();
      
      if (evt.touches.length === 1 && this.zoomState.isPanning && !this.zoomState.isPinching) {
        // Pan avec un doigt
        const touch = evt.touches[0];
        this.setViewportTransform(
          {
            x: touch.clientX - this.zoomState.panStartX,
            y: touch.clientY - this.zoomState.panStartY,
          },
          { emitZoom: false },
        );
      } else if (evt.touches.length === 2 && this.zoomState.isPinching) {
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
          const newScale = Math.max(
            this.zoomState.minScale,
            Math.min(this.zoomState.maxScale, this.zoomState.scale * scaleChange)
          );
          
          // Convertir la position du centre en coordonnées monde
          const worldPos = this.viewport.toLocal({ x: centerX, y: centerY } as any);

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

    const touchEndHandler = (evt: TouchEvent) => {
      evt.preventDefault();
      
      if (evt.touches.length === 0) {
        // Tous les doigts levés
        this.zoomState.isPanning = false;
        this.zoomState.isPinching = false;
        this.zoomState.lastPinchDistance = 0;
      } else if (evt.touches.length === 1) {
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

    (this.app.canvas as any)._zoomPanHandlers = {
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

  private updateTimeScale() {
    // Future: implémenter l'ajustement dynamique des graduations
  }

  public zoomIn() {
    if (!this.isInteractive) return;
    // Utiliser le centre de l'écran visible (viewport) plutôt que le centre du canvas bitmap
    const rect = this.app.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldPos = this.viewport.toLocal({ x: centerX, y: centerY } as any);

    const newScale = Math.min(this.zoomState.maxScale, this.zoomState.scale * 1.2);

    this.setViewportTransform({
      scale: newScale,
      x: centerX - worldPos.x * newScale,
      y: centerY - worldPos.y * newScale,
    });
  }

  public zoomOut() {
    if (!this.isInteractive) return;
    // Utiliser le centre de l'écran visible (viewport) plutôt que le centre du canvas bitmap
    const rect = this.app.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldPos = this.viewport.toLocal({ x: centerX, y: centerY } as any);

    const newScale = Math.max(this.zoomState.minScale, this.zoomState.scale * 0.8);

    this.setViewportTransform({
      scale: newScale,
      x: centerX - worldPos.x * newScale,
      y: centerY - worldPos.y * newScale,
    });
  }

  public async resetView(): Promise<void> {
    if (!this.isInteractive) {
      return;
    }
    this.forceInitialFit();
    await this.draw();
    if (this.scenePaintState !== 'stable') {
      this.scheduleDraw('resetViewGuard');
    }
  }

  /** Force the next draw to fit the world to the current canvas size. */
  public forceInitialFit(): void {
    this.needsInitialFit = true;
  }

  public getZoomLevel(): number {
    return this.zoomState.scale;
  }

  /**
   * Étirement indépendant par axe (x = temps, y = catégories), appliqué
   * par-dessus le zoom uniforme existant (pan/molette/+-, inchangé).
   * Redessine les axes/données (labels et marqueurs recréés à chaque draw)
   * pour que le contre-scaling anti-déformation (voir YAxis/xAxis/DataArea)
   * soit appliqué avec la nouvelle valeur.
   */
  public setAxisStretch(next: { x?: number; y?: number }): Promise<void> {
    if (typeof next.x === 'number' && Number.isFinite(next.x)) {
      this.axisStretch.x = Math.max(
        this.axisStretch.minStretch,
        Math.min(this.axisStretch.maxStretch, next.x),
      );
    }
    if (typeof next.y === 'number' && Number.isFinite(next.y)) {
      this.axisStretch.y = Math.max(
        this.axisStretch.minStretch,
        Math.min(this.axisStretch.maxStretch, next.y),
      );
    }

    const stretch = { x: this.axisStretch.x, y: this.axisStretch.y };
    this.yAxis.setAxisStretch(stretch);
    this.xAxis.setAxisStretch(stretch);
    this.dataArea.setAxisStretch(stretch);

    if (!this.isInteractive) {
      return Promise.resolve();
    }
    return this.draw();
  }

  public getAxisStretch(): { x: number; y: number } {
    return { x: this.axisStretch.x, y: this.axisStretch.y };
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
  public async exportAsImage(
    format: 'png' | 'jpeg' = 'png',
    quality = 0.92,
  ): Promise<string | null> {
    const task = this.exportQueue.then(() => this.runExportAsImage(format, quality));
    this.exportQueue = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  private async runExportAsImage(
    format: 'png' | 'jpeg',
    quality: number,
  ): Promise<string | null> {
    if (!this.app.canvas || !this.isInitialized || !this.app.renderer) {
      return null;
    }

    this.exportInProgress = true;
    this.dataArea.setHoverOverlaySuppressed(true);
    this.dataArea.clearHoverOverlay({ skipPaint: true });

    const originalWidth = this.app.screen.width;
    const originalHeight = this.app.screen.height;
    const requiredHeight = this.getRequiredCanvasHeight();
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
        const fitViewport = computeFitViewport(
          this.worldBounds,
          exportCanvasSize,
          this.zoomState.minScale,
          this.zoomState.maxScale,
        );
        // Applique aussi axisStretch (via setViewportTransform) : l'export
        // reflète l'étirement courant, comme ce que l'utilisatrice voit à l'écran.
        this.setViewportTransform(
          { scale: fitViewport.scaleX, x: fitViewport.x, y: fitViewport.y },
          { emitZoom: false, skipRender: true },
        );
      }

      // Direct enqueue (not draw()): avoids deadlock with external draws that
      // wait on exportQueue off-chain before enqueueing.
      await this.enqueueDrawBody();
      this.paint('export');
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      return (this.app.canvas as HTMLCanvasElement).toDataURL(mimeType, quality);
    } finally {
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
      } finally {
        this.exportInProgress = false;
        this.dataArea.setHoverOverlaySuppressed(false);
      }
    }
  }

  public destroy() {
    this.isInitialized = false;

    if (this.drawRafId !== null) {
      cancelAnimationFrame(this.drawRafId);
      this.drawRafId = null;
    }
    this.drawDispatchActive = false;
    this.pendingPartialPaint = false;
    this.recoveryDrawScheduled = false;
    this.cancelContextRestoreRafs();
    this.contextRestoring = false;
    const pendingResolvers = this.drawResolvers;
    this.drawResolvers = [];
    pendingResolvers.forEach((r) => r.resolve());

    this.teardownContextHandlers?.();

    if (this.dataArea) {
      this.dataArea.clearHoverOverlay({ skipPaint: true });
    }

    if (this.app.canvas && (this.app.canvas as any)._zoomPanHandlers) {
      const handlers = (this.app.canvas as any)._zoomPanHandlers;
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

