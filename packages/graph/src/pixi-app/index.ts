import { Application, Container, EventEmitter } from 'pixi.js';
import { xAxis } from './axis/x-axis';
import { YAxis } from './axis/y-axis';
import { DataArea } from './data-area';
import type { IObservation, IProtocol, IGraphPreferences, IProtocolItem, IPeriod } from '@actograph/core';
import { filterReadingsForGraphDisplay } from '@actograph/core';
import { getGraphPausePeriods } from '../utils/pause-periods.utils';
import { getObservableGraphPreferences, hydrateProtocolItemsFromStringIfNeeded } from '../utils/protocol.utils';
import { bindPatternTextureStore, unbindPatternTextureStore } from '../lib/pattern-textures';
import { PatternTextureStore } from '../gpu/PatternTextureStore';
import { RenderScheduler } from '../engine/RenderScheduler';
import { DirtyRegistry } from '../engine/DirtyRegistry';
import { GraphEngine } from '../engine/GraphEngine';
import type { DrawError } from '../engine/types';
import { toDrawErrorMessage } from '../engine/types';
import { ExportPipeline } from '../engine/ExportPipeline';
import { HoverLayer } from '../layers/HoverLayer';
import { AxisLabelOverlay } from '../layers/AxisLabelOverlay';
import { computePlotBoundsInOverlay } from '../utils/hover-bounds.utils';
import {
  clampViewport,
  computeFitViewport,
  isDegenerateCanvasSize,
  preserveViewportOnResize,
  anchorZoomTranslation,
  type ViewportState,
  type WorldBounds,
} from '../utils/viewport.utils';
import type { IGraphRenderOptions } from '../types/graph-render-options';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../types/graph-render-options';
import {
  GRAPH_CANVAS_CURSOR_IDLE,
  GRAPH_CANVAS_CURSOR_PANNING,
} from '../utils/graph-cursor.constants';

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
  private overlayRoot!: Container;
  private plot!: Container;
  private xAxis!: xAxis;
  private yAxis!: YAxis;
  private dataArea!: DataArea;
  private graphEngine!: GraphEngine;
  private exportPipeline!: ExportPipeline;
  private hoverLayer!: HoverLayer;
  private axisLabelOverlay!: AxisLabelOverlay;
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
  /** Canvas passé à init(); évite d'accéder à app.canvas après destroy. */
  private viewCanvas: HTMLCanvasElement | null = null;
  private isDestroyed = false;
  private worldBounds: WorldBounds = { width: 1, height: 1 };
  private fitViewport: ViewportState = { scaleX: 1, scaleY: 1, x: 0, y: 0 };
  private needsInitialFit = false;
  /** True until the first post-mount layout settle fit completes (interactive only). */
  private layoutFitPending = false;
  private pausePeriods: IPeriod[] = [];
  private graphRenderOptions: IGraphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };
  private exportInProgress = false;
  private exportQueue: Promise<unknown> = Promise.resolve();
  private patternStore = new PatternTextureStore();
  private renderScheduler = new RenderScheduler();
  private drawFrameScheduled = false;
  private drawResolvers: Array<{
    resolve: () => void;
    reject: (reason?: unknown) => void;
  }> = [];
  private drawInProgress = false;
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
   * Per-layer dirty/midDraw state. midDraw is true while a full draw has
   * cleared axis graphics but not yet flushed app.render(). Partial paints
   * (hover, redrawCategory, pan) must not call app.render() while any layer
   * is midDraw — they would show empty axes.
   */
  private dirtyRegistry = new DirtyRegistry();
  private contextRestoring = false;
  private contextRestoreOuterRafId: number | null = null;
  private contextRestoreInnerRafId: number | null = null;
  private viewportPaintRafId: number | null = null;
  private pendingViewportLabelRefresh = false;

  /** Émetteur d'événements pour notifier les changements d'état (ex: zoom) */
  public events = new EventEmitter();

  /** Erreurs de la dernière tentative de draw (catégories ou draw complet). */
  private _lastDrawErrors: ReadonlyArray<DrawError> = [];

  get lastDrawErrors(): ReadonlyArray<DrawError> {
    return this._lastDrawErrors;
  }

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
    this.registerDirtyLayers();
  }

  private registerDirtyLayers(): void {
    this.dirtyRegistry.register('axis');
    this.dirtyRegistry.register('series');
    this.dirtyRegistry.register('background');
    this.dirtyRegistry.register('frieze');
    this.dirtyRegistry.register('pause');
    this.dirtyRegistry.register('hover');
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
    this.viewCanvas = canvas;
    this.isDestroyed = false;
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
      resolution: Math.min(dpr, 2), // Cap HiDPI GPU fill; geometry unchanged via autoDensity
      autoDensity: true,    // Ajuste automatiquement la densité
      preserveDrawingBuffer: false,
      // Explicit renders only: the default ticker would call app.render() every
      // frame and bypass drawInProgress / midDraw guards.
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
    bindPatternTextureStore(this.patternStore);

    this.hoverLayer = new HoverLayer(this.app, { interactive: this.isInteractive });
    this.hoverLayer.setGraphRenderOptions(this.graphRenderOptions);
    this.hoverLayer.setDrawStateCallbacks({
      isDrawInProgress: () => this.isDrawInProgress(),
      isUnsafeToPaint: () => this.dirtyRegistry.isAnyUnsafeToPaint(),
      isExportInProgress: () => this.exportInProgress,
      requestRender: () => this.requestRender(),
    });

    this.axisLabelOverlay = new AxisLabelOverlay();
    this.axisLabelOverlay.setProjectors({
      worldToOverlay: (p) => this.overlayRoot.toLocal(this.plot.toGlobal(p)),
    });

    this.overlayRoot = new Container();
    this.overlayRoot.addChild(this.axisLabelOverlay.container);
    this.overlayRoot.addChild(this.hoverLayer.container);

    this.viewport = new Container();
    this.viewport.x = 0;
    this.viewport.y = 0;
    this.viewport.scale.set(1);

    this.plot = new Container();
    this.plot.addChild(this.xAxis);
    this.plot.addChild(this.yAxis);
    this.plot.addChild(this.dataArea);
    this.dataArea.setPlotContainer(this.plot);

    this.graphEngine = new GraphEngine({
      app: this.app,
      plot: this.plot,
      dataArea: this.dataArea,
      yAxis: this.yAxis,
      xAxis: this.xAxis,
      patternStore: this.patternStore,
    });

    this.exportPipeline = new ExportPipeline({
      app: this.app,
      isInteractive: () => this.isInteractive,
      getRequiredCanvasHeight: () => this.getRequiredCanvasHeight(),
      enqueueDrawBody: () => this.enqueueDrawBody(),
      setViewportTransform: (transform, options) =>
        this.setViewportTransform(transform, options),
      updateWorldBounds: () => this.updateWorldBounds(),
      recalculateFitViewport: () => this.recalculateFitViewport(),
      getWorldBounds: () => this.worldBounds,
      getZoomState: () => this.zoomState,
      getViewportTransform: () => ({
        scale: this.zoomState.scale,
        x: this.zoomState.x,
        y: this.zoomState.y,
      }),
      setHoverSuppressed: (suppressed) => {
        this.hoverLayer.setSuppressed(suppressed);
        if (suppressed) {
          this.hoverLayer.clear();
        }
      },
    });

    this.viewport.addChild(this.plot);
    this.app.stage.addChild(this.viewport);
    this.app.stage.addChild(this.overlayRoot);

    this.dataArea.setHoverController(this.hoverLayer);
    this.dataArea.setWorldToOverlay((p) =>
      this.overlayRoot.toLocal(this.dataArea.toGlobal(p)),
    );
    this.hoverLayer.setBoundsDeps({
      getPlotBoundsInOverlay: () => this.getPlotBoundsInOverlay(),
      clientPointToOverlayLocal: (clientX, clientY) => {
        const canvas = this.app.canvas as HTMLCanvasElement | null;
        if (!canvas) {
          return null;
        }
        const rect = canvas.getBoundingClientRect();
        return this.overlayRoot.toLocal({
          x: clientX - rect.left,
          y: clientY - rect.top,
        } as { x: number; y: number });
      },
      getCanvas: () => (this.app.canvas as HTMLCanvasElement | null) ?? null,
    });

    this.yAxis.init();
    this.xAxis.init();
    this.dataArea.init();
    this.hoverLayer.init();

    this.setupZoomAndPan();
    this.bindWebGLContextHandlers();

    this.isInitialized = true;
    if (this.isInteractive) {
      this.layoutFitPending = true;
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

    if (this.layoutFitPending && this.isInteractive) {
      this.needsInitialFit = true;
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
      this.requestRender();
    }
    return true;
  }

  /**
   * Re-mesure le canvas après stabilisation du layout (splitter / flex) et
   * force un fit initial. À appeler une fois après le premier setData post-mount.
   */
  public async settleInitialLayoutFit(): Promise<void> {
    if (!this.isInitialized || !this.isInteractive) return;
    this.resizeFromCanvas({ skipRender: true });
    this.needsInitialFit = true;
    await this.draw();
    const { width, height } = this.getCanvasSize();
    if (!isDegenerateCanvasSize(width, height)) {
      this.layoutFitPending = false;
    }
  }

  /**
   * Clears hover and marks pattern textures stale before a visibility resume refresh.
   * Forces initial fit so axes cannot stay off-canvas after a bad viewport preserved
   * across tab hide/show.
   */
  public prepareForResumeRefresh(): void {
    this.renderScheduler.bumpGeneration();
    this.hoverLayer.clear();
    this.needsPatternTextureRefresh = true;
    // Bloque requestRender() / hover jusqu'au prochain draw complet : après
    // resize(skipRender) le buffer peut encore montrer une bonne frame alors que
    // viewport et scène ne sont plus alignés.
    this.dirtyRegistry.invalidateAll('full');
    this.dirtyRegistry.markAllMidDraw();
    // Always re-fit on resume: preserving zoom across a hidden tab often leaves
    // the camera on an empty region (axes "disappeared", one data fragment left).
    this.needsInitialFit = true;
    this.layoutFitPending = true;
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
    this.hoverLayer.clear();
    this.needsPatternTextureRefresh = true;
    this.needsInitialFit = true;
    this.layoutFitPending = true;
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
    return Promise.all([
      this.drawChain,
      exportGate,
      this.renderScheduler.flush(),
    ]).then(() => undefined);
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
      this.hoverLayer.clear();
      this.needsPatternTextureRefresh = true;
      this.forcePatternTextureClear = true;
      this.dirtyRegistry.invalidateAll('full');
      this.dirtyRegistry.markAllMidDraw();
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
    this.renderScheduler.bumpGeneration();
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
    this.hoverLayer.setObservation(graphObservation);
    this.hoverLayer.setGraphRenderOptions(this.graphRenderOptions);

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
    this.hoverLayer.setGraphRenderOptions(this.graphRenderOptions);
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

  public redrawCategory(_categoryId: string): void {
    this.scheduleDraw('redrawCategory');
  }

  public redrawObservable(_observableId: string): void {
    this.scheduleDraw('redrawObservable');
  }

  public isDrawInProgress(): boolean {
    return this.drawInProgress;
  }

  /** Planifie un redraw complet (pas d'auto-retry en boucle). */
  public retryDraw(): void {
    this.scheduleDraw('retry');
  }

  /** Emit once per draw with the full error list (empty array on success). */
  private emitDrawErrors(errors: ReadonlyArray<DrawError>): void {
    this._lastDrawErrors = errors;
    this.events.emit('drawErrors', errors);
    for (const err of errors) {
      this.events.emit('drawError', err);
    }
  }

  /**
   * Renders only when the app is ready and no full draw/export is in flight.
   * If axis graphics were cleared and not yet redrawn, schedules a full draw
   * instead of painting the empty-axes scene (hover/pan must not "exclude" axes).
   */
  public requestRender(): void {
    if (
      !this.isInitialized ||
      !this.app.renderer ||
      this.drawInProgress ||
      this.exportInProgress
    ) {
      return;
    }
    if (this.dirtyRegistry.isAnyUnsafeToPaint()) {
      this.scheduleDraw('renderGate');
      return;
    }
    this.app.render();
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
      if (this.drawFrameScheduled) {
        return;
      }
      this.drawFrameScheduled = true;
      this.renderScheduler.request(
        async () => {
          this.drawFrameScheduled = false;
          const resolvers = this.drawResolvers;
          this.drawResolvers = [];

          // Wait for export OFF drawChain, then enqueue the body. Waiting for
          // exportQueue while already on drawChain deadlocks against export,
          // which must also enqueue bodies on the same chain.
          try {
            while (this.exportInProgress) {
              await this.exportQueue;
            }
            await this.enqueueDrawBody();
            resolvers.forEach((r) => r.resolve());
          } catch (error) {
            resolvers.forEach((r) => r.reject(error));
          }
        },
        { ignoreStale: true },
      );
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
    this._lastDrawErrors = [];
    try {
      // Drop any pending hover: resuming it after a full draw was racing with
      // remount DRAW#2 (resize/watch) and painting emptied axes over a stale
      // framebuffer on the next pointermove.
      this.hoverLayer.clear({ cancelPending: true });

      if (this.needsPatternTextureRefresh) {
        const hadPatterns = this.graphEngine.hasPatternSprites();
        if (hadPatterns || this.forcePatternTextureClear) {
          this.graphEngine.clearPatternSprites();
          this.patternStore.evict();
          this.forcePatternTextureClear = false;
        }
        this.needsPatternTextureRefresh = false;
      }

      this.plot.x = 0;
      this.plot.y = 0;
      this.plot.scale.set(1);
      this.plot.rotation = 0;

      // Axis draw() clears graphics first — stay midDraw until the full scene
      // has been rendered, so hover/pan cannot paint emptied axes.
      this.dirtyRegistry.markAllMidDraw();
      this.graphEngine.prepareWorld();

      if (this.isInteractive) {
        this.updateWorldBounds();
        this.recalculateFitViewport();
        if (this.needsInitialFit) {
          this.needsInitialFit = false;
          this.setViewportTransform(
            { scale: this.fitViewport.scaleX, x: this.fitViewport.x, y: this.fitViewport.y },
            { skipRender: true, skipLabelRefresh: true },
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
            { emitZoom: false, skipRender: true, skipLabelRefresh: true },
          );
        }
      } else {
        this.updateWorldTransforms();
      }

      this.syncAxisLabelOverlay();

      this.emitDrawErrors(this.graphEngine.getLastDrawErrors());

      // Always flush the framebuffer after a full draw.
      if (!this.isInitialized || !this.app.renderer) {
        throw new Error('PixiApp renderer unavailable at end of draw');
      }
      this.app.render();
      // Success path only: scene is coherent again, partial paints are safe.
      this.dirtyRegistry.resetAllMidDraw();
    } catch (error) {
      // Axes/data clear at the start of draw. If we fail mid-way and then let
      // hover call requestRender(), the user sees empty axes + orphan crosshair.
      // Keep midDraw=true until a later successful full draw (same invariant as
      // the old axesGraphicsDirty flag on failure).
      console.error('[PixiApp] Full draw failed:', error);
      this.emitDrawErrors([
        {
          layerId: 'full',
          message: toDrawErrorMessage(error),
        },
      ]);
      this.dirtyRegistry.invalidateAll('full');
      this.dirtyRegistry.markAllMidDraw();
      this.needsInitialFit = true;
      this.needsPatternTextureRefresh = true;
      this.hoverLayer.clear({ cancelPending: true });
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
  private collectAxisLabelDescriptors() {
    return [...this.xAxis.getLabelDescriptors(), ...this.yAxis.getLabelDescriptors()];
  }

  private syncAxisLabelOverlay(): void {
    this.axisLabelOverlay.sync(this.collectAxisLabelDescriptors());
  }

  private refreshAxisLabelOverlay(): void {
    this.axisLabelOverlay.syncPositions();
  }

  private scheduleViewportPaint(includeLabelRefresh: boolean): void {
    if (includeLabelRefresh) {
      this.pendingViewportLabelRefresh = true;
    }
    if (this.viewportPaintRafId !== null) {
      return;
    }
    this.viewportPaintRafId = requestAnimationFrame(() => {
      this.viewportPaintRafId = null;
      if (this.pendingViewportLabelRefresh) {
        this.pendingViewportLabelRefresh = false;
        this.refreshAxisLabelOverlay();
      }
      this.requestRender();
    });
  }

  private cancelViewportPaintRaf(): void {
    if (this.viewportPaintRafId !== null) {
      cancelAnimationFrame(this.viewportPaintRafId);
      this.viewportPaintRafId = null;
    }
    this.pendingViewportLabelRefresh = false;
  }

  private updateWorldTransforms(): void {
    this.viewport.getGlobalTransform();
  }

  public async clear() {
    this.renderScheduler.bumpGeneration();
    this.yAxis.clear();
    this.xAxis.clear();
    this.dataArea.clear();
    this.axisLabelOverlay.clear();
    this.graphEngine.clearAll();
    this.dirtyRegistry.invalidateAll('full');
    this.dirtyRegistry.markAllMidDraw();
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

  private getPlotBoundsInOverlay() {
    const yAxisStart = this.yAxis.getAxisStart();
    const yAxisEnd = this.yAxis.getAxisEnd();
    const xAxisEnd = this.xAxis.getAxisEnd();
    if (!yAxisStart || !yAxisEnd || !xAxisEnd) {
      return null;
    }
    return computePlotBoundsInOverlay({
      yAxisStart: yAxisStart as { x: number; y: number },
      yAxisEnd: yAxisEnd as { x: number; y: number },
      xAxisEnd: xAxisEnd as { x: number; y: number },
      yAxisToGlobal: (p) => this.yAxis.toGlobal(p),
      xAxisToGlobal: (p) => this.xAxis.toGlobal(p),
      overlayToLocal: (p) => this.overlayRoot.toLocal(p),
    });
  }

  private setViewportTransform(
    transform: { scale?: number; x?: number; y?: number },
    options?: { emitZoom?: boolean; skipRender?: boolean; skipLabelRefresh?: boolean },
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
    // Pan/zoom changes world→overlay mapping; clear stale crosshair until the
    // user moves the pointer again.
    this.hoverLayer.clear();

    if (options?.emitZoom !== false) {
      this.events.emit('zoom', baseScale);
      this.updateTimeScale();
    }

    if (!options?.skipRender) {
      this.scheduleViewportPaint(!options?.skipLabelRefresh);
    } else if (!options?.skipLabelRefresh) {
      this.refreshAxisLabelOverlay();
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

      const anchored = anchorZoomTranslation(
        mouseX,
        mouseY,
        worldPos.x,
        worldPos.y,
        newScale,
        this.axisStretch,
      );

      this.setViewportTransform({
        scale: newScale,
        x: anchored.x,
        y: anchored.y,
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
        this.hoverLayer.syncDismissWithPointer(evt.clientX, evt.clientY);
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
      // Canvas exit: Pixi hit-area pointerleave alone does not cover leaving
      // the element. syncHoverDismissWithPointer covers leave-to-axes.
      this.hoverLayer.dismiss();
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

          const anchored = anchorZoomTranslation(
            centerX,
            centerY,
            worldPos.x,
            worldPos.y,
            newScale,
            this.axisStretch,
          );

          this.setViewportTransform({
            scale: newScale,
            x: anchored.x,
            y: anchored.y,
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

    const anchored = anchorZoomTranslation(
      centerX,
      centerY,
      worldPos.x,
      worldPos.y,
      newScale,
      this.axisStretch,
    );

    this.setViewportTransform({
      scale: newScale,
      x: anchored.x,
      y: anchored.y,
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

    const anchored = anchorZoomTranslation(
      centerX,
      centerY,
      worldPos.x,
      worldPos.y,
      newScale,
      this.axisStretch,
    );

    this.setViewportTransform({
      scale: newScale,
      x: anchored.x,
      y: anchored.y,
    });
  }

  public resetView(): Promise<void> {
    if (!this.isInteractive) {
      return Promise.resolve();
    }
    this.needsInitialFit = true;
    return this.draw().then(() => {
      this.layoutFitPending = false;
    });
  }

  public getZoomLevel(): number {
    return this.zoomState.scale;
  }

  /**
   * Étirement indépendant par axe (x = temps, y = catégories), appliqué
   * par-dessus le zoom uniforme existant (pan/molette/+-, inchangé).
   * Redessine les axes/données pour appliquer axisStretch aux marques monde
   * (ticks, frises) ; les labels d'axe sont en screen-space (AxisLabelOverlay).
   * Passer `{ redraw: false }` pour mettre à jour le stretch sans peindre
   * (redrawFromObservation appelle toujours draw() après setData).
   */
  public setAxisStretch(
    next: { x?: number; y?: number },
    options?: { redraw?: boolean },
  ): Promise<void> {
    const prevX = this.axisStretch.x;
    const prevY = this.axisStretch.y;

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

    if (this.axisStretch.x === prevX && this.axisStretch.y === prevY) {
      return Promise.resolve();
    }

    const stretch = { x: this.axisStretch.x, y: this.axisStretch.y };
    this.yAxis.setAxisStretch(stretch);
    this.xAxis.setAxisStretch(stretch);
    this.dataArea.setAxisStretch(stretch);

    if (!this.isInteractive) {
      return Promise.resolve();
    }
    if (options?.redraw === false) {
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
    try {
      return await this.exportPipeline.exportAsImage(format, quality);
    } finally {
      this.exportInProgress = false;
    }
  }

  public destroy() {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;
    this.isInitialized = false;
    this.layoutFitPending = false;

    try {
      this.renderScheduler.cancel();
      this.renderScheduler.bumpGeneration();
      this.drawFrameScheduled = false;
      this.cancelViewportPaintRaf();
      this.cancelContextRestoreRafs();
      this.contextRestoring = false;
      const pendingResolvers = this.drawResolvers;
      this.drawResolvers = [];
      pendingResolvers.forEach((r) => r.resolve());

      this.teardownContextHandlers?.();

      if (this.dataArea) {
        this.axisLabelOverlay.destroy();
        this.hoverLayer.destroy();
        this.graphEngine.clearPatternSprites();
      }
      if (this.overlayRoot) {
        this.overlayRoot.destroy({ children: true });
      }
      this.patternStore.evict();
      unbindPatternTextureStore(this.patternStore);

      const canvas = this.viewCanvas;
      if (canvas && (canvas as any)._zoomPanHandlers) {
        const handlers = (canvas as any)._zoomPanHandlers;
        canvas.removeEventListener('wheel', handlers.wheel);
        canvas.removeEventListener('pointerdown', handlers.pointerdown);
        canvas.removeEventListener('pointermove', handlers.pointermove);
        canvas.removeEventListener('pointerup', handlers.pointerup);
        canvas.removeEventListener('pointercancel', handlers.pointercancel);
        canvas.removeEventListener('pointerleave', handlers.pointerleave);
        canvas.removeEventListener('touchstart', handlers.touchstart);
        canvas.removeEventListener('touchmove', handlers.touchmove);
        canvas.removeEventListener('touchend', handlers.touchend);
        canvas.removeEventListener('touchcancel', handlers.touchcancel);
        delete (canvas as any)._zoomPanHandlers;
      }
      this.viewCanvas = null;

      this.events.removeAllListeners();
    } catch (error) {
      console.warn('[PixiApp] destroy cleanup failed:', error);
    }

    try {
      this.app.destroy();
    } catch (error) {
      console.warn('[PixiApp] app.destroy failed:', error);
    }
  }
}

