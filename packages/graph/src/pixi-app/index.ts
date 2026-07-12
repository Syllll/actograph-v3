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
  preserveViewportOnResize,
  type WorldBounds,
} from '../utils/viewport.utils';
import type { IGraphRenderOptions } from '../types/graph-render-options';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../types/graph-render-options';

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
  private fitViewport = { scale: 1, x: 0, y: 0 };
  private needsInitialFit = false;
  private pausePeriods: IPeriod[] = [];
  private graphRenderOptions: IGraphRenderOptions = { ...DEFAULT_GRAPH_RENDER_OPTIONS };

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
      // ⚠️ PAS DE resizeTo - on contrôle les dimensions manuellement via DCanvas
      // Utiliser resizeTo causerait des conflits avec notre gestion des dimensions
    });

    this.yAxis = new YAxis(this.app);
    this.xAxis = new xAxis(this.app, this.yAxis);
    this.dataArea = new DataArea(this.app, this.yAxis, this.xAxis, {
      interactive: this.isInteractive,
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
   */
  public resizeFromCanvas(): void {
    // Le renderer n'existe pas tant que init() n'a pas abouti (ou après destroy).
    // Accéder à app.canvas/renderer avant cela lèverait une exception.
    if (!this.isInitialized || !this.app.renderer) {
      return;
    }

    const canvas = this.app.canvas as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    // Anti-boucle ResizeObserver : si la taille n'a pas réellement changé, ne
    // pas re-déclencher un resize + render (qui pourrait relancer un cycle de
    // mesure/layout et faire « vibrer » le canvas et le watermark).
    if (width === this.app.screen.width && height === this.app.screen.height) {
      return;
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
      return;
    }

    this.app.renderer.resize(width, height);
    if (this.isInteractive) {
      this.updateWorldBounds();
      this.recalculateFitViewport();
      const clamped = preserveViewportOnResize(
        {
          scale: this.zoomState.scale,
          x: this.viewport.x,
          y: this.viewport.y,
        },
        this.worldBounds,
        this.getCanvasSize(),
      );
      this.setViewportTransform(clamped, { emitZoom: false });
    } else {
      this.app.render();
    }
  }

  /**
   * Refresh rendering after window resize, visibility resume, or WebGL context restore.
   */
  public refreshAfterResume(): void {
    this.resizeFromCanvas();
    void this.draw();
  }

  private bindWebGLContextHandlers(): void {
    const canvas = this.app.canvas as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    const onContextLost = (event: Event) => {
      event.preventDefault();
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

    this.pausePeriods = getGraphPausePeriods(graphObservation.readings ?? []);

    this.yAxis.setData(graphObservation);
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
    this.dataArea.setGraphRenderOptions(this.graphRenderOptions);
    if (drawOptions?.redraw !== false) {
      void this.draw();
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

  public updateObservablePreference(observableId: string, preference: Partial<IGraphPreferences>) {
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
          this.draw();
          break;
        }
      }
    }
  }

  public async draw() {
    this.plot.x = 0;
    this.plot.y = 0;
    this.plot.scale.set(1);
    this.plot.rotation = 0;

    this.yAxis.draw();
    this.xAxis.draw();
    this.dataArea.draw();

    const currentScale = this.viewport.scale.x;
    this.viewport.scale.set(currentScale + 0.0001);
    this.viewport.scale.set(currentScale);

    if (this.isInteractive) {
      this.updateWorldBounds();
      this.recalculateFitViewport();
      if (this.needsInitialFit) {
        this.needsInitialFit = false;
        this.setViewportTransform({ ...this.fitViewport }, { skipRender: true });
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
    }

    // Rendu explicite : ne pas dépendre uniquement du ticker. Sans cela, le
    // canvas WebGL reste sur son buffer initial (noir) jusqu'à ce qu'un
    // événement (resize/interaction) déclenche enfin un rendu.
    if (this.isInitialized && this.app.renderer) {
      this.app.render();
    }
  }

  public async clear() {
    this.yAxis.clear();
    this.xAxis.clear();
    this.dataArea.clear();
  }

  private getCanvasSize(): { width: number; height: number } {
    return {
      width: this.app.screen.width,
      height: this.app.screen.height,
    };
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
    const scale = transform.scale ?? this.zoomState.scale;
    const clamped = clampViewport(
      {
        scale,
        x: transform.x ?? this.viewport.x,
        y: transform.y ?? this.viewport.y,
      },
      this.worldBounds,
      this.getCanvasSize(),
    );

    this.zoomState.scale = clamped.scale;
    this.zoomState.x = clamped.x;
    this.zoomState.y = clamped.y;
    this.viewport.scale.set(clamped.scale);
    this.viewport.x = clamped.x;
    this.viewport.y = clamped.y;

    if (options?.emitZoom !== false) {
      this.events.emit('zoom', clamped.scale);
      this.updateTimeScale();
    }

    if (!options?.skipRender && this.isInitialized && this.app.renderer) {
      this.app.render();
    }
  }

  private setupZoomAndPan() {
    this.app.canvas.style.cursor = 'default';
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

    // CORRECTION : mouseDownHandler doit activer le panning
    const mouseDownHandler = (evt: MouseEvent) => {
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        return;
      }

      // Activer le panning sur clic gauche
      if (evt.button === 0) {
        this.zoomState.isPanning = true;
        this.zoomState.panStartX = evt.clientX - this.zoomState.x;
        this.zoomState.panStartY = evt.clientY - this.zoomState.y;
        this.app.canvas.style.cursor = 'grabbing';
      }
    };

    const mouseMoveHandler = (evt: MouseEvent) => {
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        if (this.zoomState.isPanning) {
          this.zoomState.isPanning = false;
          this.app.canvas.style.cursor = 'default';
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
      } else {
        // Changer le curseur au survol si on peut panner
        this.app.canvas.style.cursor = 'grab';
      }
    };

    const mouseUpHandler = (evt: MouseEvent) => {
      if (evt.button === 0) {
        this.zoomState.isPanning = false;
        this.app.canvas.style.cursor = 'default';
      }
    };

    const mouseLeaveHandler = () => {
      this.zoomState.isPanning = false;
      this.app.canvas.style.cursor = 'default';
    };

    // Support touch/pointer events pour mobile
    const pointerDownHandler = (evt: PointerEvent) => {
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        return;
      }

      if (evt.pointerType === 'touch' || evt.pointerType === 'mouse') {
        this.zoomState.isPanning = true;
        this.zoomState.panStartX = evt.clientX - this.zoomState.x;
        this.zoomState.panStartY = evt.clientY - this.zoomState.y;
        this.app.canvas.style.cursor = 'grabbing';
        evt.preventDefault();
      }
    };

    const pointerMoveHandler = (evt: PointerEvent) => {
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        if (this.zoomState.isPanning) {
          this.zoomState.isPanning = false;
          this.app.canvas.style.cursor = 'default';
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
      }
    };

    const pointerUpHandler = (evt: PointerEvent) => {
      if (evt.pointerType === 'touch' || evt.pointerType === 'mouse') {
        this.zoomState.isPanning = false;
        this.app.canvas.style.cursor = 'default';
        evt.preventDefault();
      }
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

    // Mouse events (desktop)
    this.app.canvas.addEventListener('wheel', wheelHandler, { passive: false });
    this.app.canvas.addEventListener('mousedown', mouseDownHandler);
    this.app.canvas.addEventListener('mousemove', mouseMoveHandler);
    this.app.canvas.addEventListener('mouseup', mouseUpHandler);
    this.app.canvas.addEventListener('mouseleave', mouseLeaveHandler);

    // Pointer events (mobile + desktop)
    this.app.canvas.addEventListener('pointerdown', pointerDownHandler);
    this.app.canvas.addEventListener('pointermove', pointerMoveHandler);
    this.app.canvas.addEventListener('pointerup', pointerUpHandler);
    this.app.canvas.addEventListener('pointercancel', pointerUpHandler);

    // Touch events (mobile)
    this.app.canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    this.app.canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
    this.app.canvas.addEventListener('touchend', touchEndHandler, { passive: false });
    this.app.canvas.addEventListener('touchcancel', touchEndHandler, { passive: false });

    (this.app.canvas as any)._zoomPanHandlers = {
      wheel: wheelHandler,
      mousedown: mouseDownHandler,
      mousemove: mouseMoveHandler,
      mouseup: mouseUpHandler,
      mouseleave: mouseLeaveHandler,
      pointerdown: pointerDownHandler,
      pointermove: pointerMoveHandler,
      pointerup: pointerUpHandler,
      pointercancel: pointerUpHandler,
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

  public resetView(): Promise<void> {
    if (!this.isInteractive) {
      return Promise.resolve();
    }
    this.needsInitialFit = true;
    return this.draw();
  }

  public getZoomLevel(): number {
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
  public async exportAsImage(
    format: 'png' | 'jpeg' = 'png',
    quality = 0.92,
  ): Promise<string | null> {
    if (!this.app.canvas || !this.isInitialized || !this.app.renderer) {
      return null;
    }

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
      this.setViewportTransform(fitViewport, { emitZoom: false, skipRender: true });
    }

    await this.draw();
    this.app.render();
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = (this.app.canvas as HTMLCanvasElement).toDataURL(mimeType, quality);

    if (this.isInteractive) {
      if (resizedForExport) {
        this.app.renderer.resize(originalWidth, originalHeight);
        this.updateWorldBounds();
        this.recalculateFitViewport();
      }
      this.setViewportTransform(savedViewport, { emitZoom: false, skipRender: true });
      await this.draw();
    }

    return dataUrl;
  }

  public destroy() {
    this.isInitialized = false;
    this.teardownContextHandlers?.();

    if (this.app.canvas && (this.app.canvas as any)._zoomPanHandlers) {
      const handlers = (this.app.canvas as any)._zoomPanHandlers;
      this.app.canvas.removeEventListener('wheel', handlers.wheel);
      this.app.canvas.removeEventListener('mousedown', handlers.mousedown);
      this.app.canvas.removeEventListener('mousemove', handlers.mousemove);
      this.app.canvas.removeEventListener('mouseup', handlers.mouseup);
      this.app.canvas.removeEventListener('mouseleave', handlers.mouseleave);
      this.app.canvas.removeEventListener('pointerdown', handlers.pointerdown);
      this.app.canvas.removeEventListener('pointermove', handlers.pointermove);
      this.app.canvas.removeEventListener('pointerup', handlers.pointerup);
      this.app.canvas.removeEventListener('pointercancel', handlers.pointercancel);
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

