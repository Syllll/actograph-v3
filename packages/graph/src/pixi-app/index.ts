import { Application, Container } from 'pixi.js';
import { xAxis } from './axis/x-axis';
import { YAxis } from './axis/y-axis';
import { DataArea } from './data-area';
import type { IObservation, IProtocol, IGraphPreferences, IProtocolItem } from '@actograph/core';
import { getObservableGraphPreferences } from '../utils/protocol.utils';

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
  async init(options: { view: HTMLCanvasElement }) {
    const canvas = options.view;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    
    // Lire les dimensions CSS actuelles du canvas
    // Note: DCanvas doit avoir déjà configuré ces dimensions
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    
    console.log('[PixiApp] Init with dimensions:', width, 'x', height, 'dpr:', dpr);

    await this.app.init({
      background: 'white',
      canvas: canvas, // PixiJS v8 : utiliser 'canvas' au lieu de 'view' (déprécié)
      width: width,
      height: height,
      resolution: dpr,      // Pour les écrans HiDPI
      autoDensity: true,    // Ajuste automatiquement la densité
      // ⚠️ PAS DE resizeTo - on contrôle les dimensions manuellement via DCanvas
      // Utiliser resizeTo causerait des conflits avec notre gestion des dimensions
    });

    this.yAxis = new YAxis(this.app);
    this.xAxis = new xAxis(this.app, this.yAxis);
    this.dataArea = new DataArea(this.app, this.yAxis, this.xAxis);

    this.viewport = new Container();
    this.viewport.x = 0;
    this.viewport.y = 0;
    this.viewport.scale.set(1);

    this.plot = new Container();
    this.plot.addChild(this.xAxis);
    this.plot.addChild(this.yAxis);
    this.plot.addChild(this.dataArea);

    this.viewport.addChild(this.plot);
    this.app.stage.addChild(this.viewport);

    this.yAxis.init();
    this.xAxis.init();
    this.dataArea.init();

    this.setupZoomAndPan();
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

    this.yAxis.setData(observation);
    this.xAxis.setData(observation);
    this.dataArea.setData(observation);

    const requiredHeight = this.yAxis.getRequiredHeight();
    if (this.app.canvas && requiredHeight > this.app.canvas.height) {
      // CORRECTION : enlever le point-virgule dans la valeur CSS
      this.app.canvas.style.height = `${requiredHeight}px`;
      this.app.canvas.height = requiredHeight;
    }
  }

  public setProtocol(protocol: IProtocol) {
    const prot = protocol as any;
    if (prot && prot.items && typeof prot.items === 'string') {
      try {
        prot._items = JSON.parse(prot.items);
      } catch (e) {
        console.error('Failed to parse protocol items:', e);
        prot._items = [];
      }
    }

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
  }

  public async clear() {
    this.yAxis.clear();
    this.xAxis.clear();
    this.dataArea.clear();
  }

  private setupZoomAndPan() {
    this.app.canvas.style.cursor = 'default';
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

      this.zoomState.scale = newScale;

      this.viewport.x = mouseX - worldPos.x * newScale;
      this.viewport.y = mouseY - worldPos.y * newScale;

      this.viewport.scale.set(newScale);
      this.zoomState.x = this.viewport.x;
      this.zoomState.y = this.viewport.y;

      this.updateTimeScale();
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
        this.viewport.x = evt.clientX - this.zoomState.panStartX;
        this.viewport.y = evt.clientY - this.zoomState.panStartY;
        this.zoomState.x = this.viewport.x;
        this.zoomState.y = this.viewport.y;
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
        this.viewport.x = evt.clientX - this.zoomState.panStartX;
        this.viewport.y = evt.clientY - this.zoomState.panStartY;
        this.zoomState.x = this.viewport.x;
        this.zoomState.y = this.viewport.y;
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
        this.viewport.x = touch.clientX - this.zoomState.panStartX;
        this.viewport.y = touch.clientY - this.zoomState.panStartY;
        this.zoomState.x = this.viewport.x;
        this.zoomState.y = this.viewport.y;
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
          
          // Appliquer le zoom centré sur le point de contact
          this.zoomState.scale = newScale;
          this.viewport.x = centerX - worldPos.x * newScale;
          this.viewport.y = centerY - worldPos.y * newScale;
          this.viewport.scale.set(newScale);
          this.zoomState.x = this.viewport.x;
          this.zoomState.y = this.viewport.y;
          
          this.updateTimeScale();
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
    // Utiliser le centre de l'écran visible (viewport) plutôt que le centre du canvas bitmap
    const rect = this.app.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldPos = this.viewport.toLocal({ x: centerX, y: centerY } as any);

    const newScale = Math.min(this.zoomState.maxScale, this.zoomState.scale * 1.2);
    this.zoomState.scale = newScale;

    this.viewport.x = centerX - worldPos.x * newScale;
    this.viewport.y = centerY - worldPos.y * newScale;
    this.viewport.scale.set(newScale);
    this.zoomState.x = this.viewport.x;
    this.zoomState.y = this.viewport.y;

    this.updateTimeScale();
  }

  public zoomOut() {
    // Utiliser le centre de l'écran visible (viewport) plutôt que le centre du canvas bitmap
    const rect = this.app.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldPos = this.viewport.toLocal({ x: centerX, y: centerY } as any);

    const newScale = Math.max(this.zoomState.minScale, this.zoomState.scale * 0.8);
    this.zoomState.scale = newScale;

    this.viewport.x = centerX - worldPos.x * newScale;
    this.viewport.y = centerY - worldPos.y * newScale;
    this.viewport.scale.set(newScale);
    this.zoomState.x = this.viewport.x;
    this.zoomState.y = this.viewport.y;

    this.updateTimeScale();
  }

  public resetView() {
    this.zoomState.scale = 1;
    this.viewport.scale.set(1);

    this.viewport.x = 0;
    this.viewport.y = 0;
    this.zoomState.x = 0;
    this.zoomState.y = 0;

    this.updateTimeScale();
    this.draw();
  }

  public getZoomLevel(): number {
    return this.zoomState.scale;
  }

  /**
   * Exporte le graphique sous forme d'image (data URL)
   * @param format - Format de l'image : 'png' ou 'jpeg'
   * @param quality - Qualité JPEG (0-1), ignoré pour PNG
   * @returns Data URL de l'image ou null si le canvas n'est pas disponible
   */
  public exportAsImage(format: 'png' | 'jpeg' = 'png', quality = 0.92): string | null {
    if (!this.app.canvas) return null;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return (this.app.canvas as HTMLCanvasElement).toDataURL(mimeType, quality);
  }

  public destroy() {
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
    this.app.destroy();
  }
}

