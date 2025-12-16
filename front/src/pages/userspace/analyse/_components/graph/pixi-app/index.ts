import { Application, Container } from 'pixi.js';
import { xAxis } from './axis/x-axis';
import { IObservation, IProtocol, IGraphPreferences } from '@services/observations/interface';
import { yAxis } from './axis/y-axis';
import { DataArea } from './data-area';
import { getObservableGraphPreferences } from '@services/observations/protocol-graph-preferences.utils';

/**
 * Classe principale gérant l'application PixiJS pour le graphique d'activité.
 * 
 * Cette classe orchestre la création et le rendu de tous les éléments du graphique :
 * - L'axe Y (observables du protocole)
 * - L'axe X (timeline temporelle)
 * - La zone de données (readings visualisés)
 * 
 * Le graphique affiche les données d'observation sur un plan temporel où :
 * - L'axe vertical (Y) représente les observables du protocole
 * - L'axe horizontal (X) représente le temps
 * - Les readings sont visualisés comme des segments ou marqueurs
 */
export class PixiApp {
  /** Application PixiJS principale utilisée pour le rendu WebGL */
  private app: Application;
  
  /** Conteneur viewport pour le zoom et le pan */
  private viewport!: Container;
  
  /** Conteneur principal regroupant tous les éléments du graphique */
  private plot!: Container;
  
  /** Axe horizontal représentant le temps */
  private xAxis!: xAxis;
  
  /** Axe vertical représentant les observables */
  private yAxis!: yAxis;
  
  /** Zone centrale affichant les données (readings) */
  private dataArea!: DataArea;

  /** Protocole contenant les préférences graphiques */
  private protocol: IProtocol | null = null;

  /** État du zoom et pan */
  private zoomState = {
    scale: 1,
    minScale: 0.1,
    maxScale: 5,
    x: 0,
    y: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
  };

  constructor() {
    // Création d'une nouvelle application PixiJS
    // L'initialisation complète se fera dans la méthode init()
    this.app = new Application();
  }

  /**
   * Initialise l'application PixiJS avec le canvas HTML fourni.
   * 
   * Cette méthode :
   * 1. Configure l'application PixiJS (fond blanc, redimensionnement automatique)
   * 2. Crée les trois composants principaux (axes et zone de données)
   * 3. Les organise dans un conteneur hiérarchique
   * 4. Initialise chaque composant
   * 
   * @param options - Options d'initialisation
   * @param options.view - Référence au canvas HTML qui sera utilisé pour le rendu
   */
  async init(options: { view: HTMLCanvasElement }) {
    // Initialisation de l'application PixiJS
    // - background: Fond blanc pour le graphique
    // - view: Canvas HTML fourni (sera utilisé pour le rendu WebGL)
    // - resizeTo: Le canvas se redimensionnera automatiquement selon sa taille dans le DOM
    await this.app.init({
      //width: 800,
      //height: 600,
      background: 'white',
      view: options.view,
      resizeTo: options.view,
    });

    // Création des trois composants principaux du graphique
    // L'ordre de création est important car certains composants dépendent d'autres
    this.yAxis = new yAxis(this.app);
    this.xAxis = new xAxis(this.app, this.yAxis); // Dépend de yAxis pour connaître sa position
    this.dataArea = new DataArea(this.app, this.yAxis, this.xAxis); // Dépend des deux axes

    // Création du conteneur viewport pour le zoom et pan
    this.viewport = new Container();
    this.viewport.x = 0;
    this.viewport.y = 0;
    this.viewport.scale.set(1);

    // Création du conteneur principal qui regroupe tous les éléments
    // Ce conteneur permet de manipuler l'ensemble du graphique comme un seul objet
    this.plot = new Container();
    this.plot.addChild(this.xAxis);
    this.plot.addChild(this.yAxis);
    this.plot.addChild(this.dataArea);

    // Ajout du plot au viewport
    this.viewport.addChild(this.plot);

    // Ajout du viewport à la scène PixiJS
    // La scène est le conteneur racine de tous les éléments affichés
    this.app.stage.addChild(this.viewport);

    // Initialisation de chaque composant
    // Cette étape permet aux composants de configurer leurs événements, etc.
    this.yAxis.init();
    this.xAxis.init();
    this.dataArea.init();

    // Setup zoom and pan handlers
    this.setupZoomAndPan();
  }

  /**
   * Configure les données d'observation dans tous les composants du graphique.
   * 
   * Cette méthode :
   * 1. Valide que l'observation contient les données nécessaires (readings et protocol)
   * 2. Transmet les données à chaque composant (axes et zone de données)
   * 3. Ajuste la hauteur du canvas si nécessaire pour afficher tous les observables
   * 
   * @param observation - Observation complète avec readings et protocol
   * @throws Error si l'observation n'a pas de readings ou de protocol
   */
  public setData(observation: IObservation) {
    // Validation : l'observation doit contenir des readings et un protocole
    if (!observation.readings) {
      throw new Error('Observation must have readings');
    }
    if (!observation.protocol) {
      throw new Error('Observation must have protocol');
    }

    // Stocker le protocole pour accéder aux préférences
    this.protocol = observation.protocol;
    this.dataArea.setProtocol(observation.protocol);

    // Transmission des données à chaque composant
    // Chaque composant va préparer ses données internes (calculs de positions, etc.)
    this.yAxis.setData(observation);
    this.xAxis.setData(observation);
    this.dataArea.setData(observation);

    // Ajustement de la hauteur du canvas pour contenir tous les observables
    // Si la hauteur requise est supérieure à la hauteur actuelle, on l'augmente
    const requiredHeight = this.yAxis.getRequiredHeight();
    if (this.app.canvas && requiredHeight > this.app.canvas.height) {
      this.app.canvas.style.height = `${requiredHeight}px;`;
      this.app.canvas.height = requiredHeight;
    }
  }

  /**
   * Définit le protocole pour accéder aux préférences graphiques.
   * 
   * Cette méthode synchronise le protocole dans tous les composants :
   * - yAxis : pour recalculer les catégories visibles (mode Normal/Frieze)
   * - dataArea : pour les préférences de dessin
   * 
   * @param protocol - Protocole contenant les items avec leurs préférences
   */
  public setProtocol(protocol: IProtocol) {
    // S'assurer que _items est parsé si nécessaire (seulement si pas déjà parsé)
    if (protocol && protocol.items && (!protocol._items || protocol._items.length === 0)) {
      try {
        protocol._items = JSON.parse(protocol.items);
      } catch (e) {
        console.error('Failed to parse protocol items:', e);
        protocol._items = [];
      }
    }
    
    this.protocol = protocol;
    
    // Synchroniser le protocole dans tous les composants
    if (this.yAxis) {
      this.yAxis.setProtocol(protocol);
    }
    if (this.dataArea) {
      this.dataArea.setProtocol(protocol);
    }
  }

  /**
   * Récupère les préférences graphiques d'un observable avec héritage.
   * 
   * @param observableId - ID de l'observable
   * @returns Préférences graphiques avec héritage appliqué, ou null si aucune préférence
   */
  public getObservablePreferences(observableId: string): IGraphPreferences | null {
    if (!this.protocol) {
      return null;
    }
    return getObservableGraphPreferences(observableId, this.protocol);
  }

  /**
   * Met à jour les préférences d'un observable et redessine le graphe.
   * 
   * NOTE: Cette méthode ne devrait PAS muter le protocole directement.
   * Le protocole est muté par le drawer, et cette méthode ne fait que redessiner.
   * Cependant, pour maintenir la compatibilité avec le code existant qui appelle
   * cette méthode depuis le drawer, on met à jour aussi le protocole localement.
   * 
   * @param observableId - ID de l'observable
   * @param preference - Préférences partielles à mettre à jour
   */
  public updateObservablePreference(
    observableId: string,
    preference: Partial<IGraphPreferences>
  ) {
    if (!this.protocol) {
      return;
    }

    // Le protocole est une référence partagée avec le drawer
    // Le drawer a déjà mis à jour le protocole, donc on peut juste redessiner
    // Cependant, pour être sûr que le protocole est à jour, on le met à jour aussi
    // (c'est une duplication mais garantit la cohérence)
    for (const category of this.protocol._items || []) {
      if (category.children) {
        const observable = category.children.find((o) => o.id === observableId);
        if (observable) {
          // Mettre à jour les préférences (le drawer l'a déjà fait, mais on le fait aussi pour être sûr)
          if (!observable.graphPreferences) {
            observable.graphPreferences = {};
          }
          Object.assign(observable.graphPreferences, preference);
          
          // Redessiner uniquement cet observable
          if (this.dataArea) {
            this.dataArea.redrawObservable(observableId);
          }
          break;
        }
      }
    }
  }

  /**
   * Dessine tous les éléments du graphique.
   * 
   * Cette méthode appelle la méthode draw() de chaque composant dans l'ordre :
   * 1. Y-Axis (doit être dessiné en premier pour que X-Axis connaisse sa position)
   * 2. X-Axis (doit être dessiné avant DataArea pour connaître les positions temporelles)
   * 3. DataArea (dessine les données en utilisant les positions des axes)
   */
  public async draw() {
    // Réinitialiser les positions de tous les conteneurs pour garantir un état propre
    // Le plot doit toujours être à (0,0) sans transformation
    this.plot.x = 0;
    this.plot.y = 0;
    this.plot.scale.set(1);
    this.plot.rotation = 0;
    
    this.yAxis.draw();
    this.xAxis.draw();
    this.dataArea.draw();
    
    // Forcer PixiJS à détecter les changements en déclenchant une mise à jour du viewport
    // Cela simule ce qui se passe lors d'un zoom et force le re-render des nouveaux éléments
    // On fait une modification infinitésimale puis on la restaure pour ne pas affecter l'affichage
    const currentScale = this.viewport.scale.x;
    this.viewport.scale.set(currentScale + 0.0001);
    this.viewport.scale.set(currentScale);
  }

  /**
   * Efface tous les éléments du graphique.
   * 
   * Cette méthode nettoie le contenu de chaque composant sans détruire l'application.
   * Utile pour redessiner le graphique avec de nouvelles données.
   */
  public async clear() {
    this.yAxis.clear();
    this.xAxis.clear();
    this.dataArea.clear();
  }

  /**
   * Configure les gestionnaires d'événements pour le zoom et le pan
   */
  private setupZoomAndPan() {
    // Enable interaction on the canvas
    this.app.canvas.style.cursor = 'default';

    // Store event handlers for cleanup
    const wheelHandler = (evt: WheelEvent) => {
      // Ignorer les événements qui viennent du splitter ou d'autres éléments interactifs
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        return;
      }
      
      evt.preventDefault();
      
      // Get mouse position relative to canvas
      const rect = this.app.canvas.getBoundingClientRect();
      const mouseX = evt.clientX - rect.left;
      const mouseY = evt.clientY - rect.top;

      // Convert screen position to world position (before zoom)
      // worldPos = (screenPos - viewportPos) / currentScale
      const worldPos = this.viewport.toLocal({ x: mouseX, y: mouseY } as any);

      // Calculate new zoom scale
      const zoomFactor = evt.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(
        this.zoomState.minScale,
        Math.min(this.zoomState.maxScale, this.zoomState.scale * zoomFactor)
      );

      // Update scale state
      this.zoomState.scale = newScale;

      // Calculate new viewport position to keep the point under cursor fixed
      // Formula: newViewportPos = screenPos - worldPos * newScale
      this.viewport.x = mouseX - worldPos.x * newScale;
      this.viewport.y = mouseY - worldPos.y * newScale;

      // Apply the new scale
      this.viewport.scale.set(newScale);
      this.zoomState.x = this.viewport.x;
      this.zoomState.y = this.viewport.y;

      // Update time scale based on zoom
      this.updateTimeScale();
    };

    const mouseDownHandler = (evt: MouseEvent) => {
      // Ignorer les événements qui viennent du splitter ou d'autres éléments interactifs
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        return;
      }
      
      // Le pan (déplacement du graph) est désactivé
      // On ne permet plus de déplacer le graph en cliquant et en maintenant le clic
    };

    const mouseMoveHandler = (evt: MouseEvent) => {
      // Ignorer les événements qui viennent du splitter ou d'autres éléments interactifs
      const target = evt.target as HTMLElement;
      if (target && target.closest('.q-splitter__separator, .q-avatar')) {
        // Si on était en train de pan, arrêter le pan
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

    // Add event listeners
    this.app.canvas.addEventListener('wheel', wheelHandler, { passive: false });
    this.app.canvas.addEventListener('mousedown', mouseDownHandler);
    this.app.canvas.addEventListener('mousemove', mouseMoveHandler);
    this.app.canvas.addEventListener('mouseup', mouseUpHandler);
    this.app.canvas.addEventListener('mouseleave', mouseLeaveHandler);

    // Store handlers for cleanup
    (this.app.canvas as any)._zoomPanHandlers = {
      wheel: wheelHandler,
      mousedown: mouseDownHandler,
      mousemove: mouseMoveHandler,
      mouseup: mouseUpHandler,
      mouseleave: mouseLeaveHandler,
    };
  }

  /**
   * Met à jour l'échelle de temps selon le niveau de zoom.
   * 
   * Note: Cette méthode est actuellement un placeholder pour une future implémentation
   * d'ajustement dynamique des graduations de l'axe X selon le niveau de zoom.
   */
  private updateTimeScale() {
    // Future: implémenter l'ajustement dynamique des graduations de l'axe X
    // selon le niveau de zoom pour améliorer la lisibilité
  }

  /**
   * Zoom in (centré sur le milieu du canvas)
   */
  public zoomIn() {
    const centerX = this.app.canvas.width / 2;
    const centerY = this.app.canvas.height / 2;
    const worldPos = this.viewport.toLocal({ x: centerX, y: centerY } as any);

    const newScale = Math.min(this.zoomState.maxScale, this.zoomState.scale * 1.2);
    this.zoomState.scale = newScale;

    // Formule : newViewportPos = screenPos - worldPos * newScale
    this.viewport.x = centerX - worldPos.x * newScale;
    this.viewport.y = centerY - worldPos.y * newScale;
    this.viewport.scale.set(newScale);
    this.zoomState.x = this.viewport.x;
    this.zoomState.y = this.viewport.y;

    this.updateTimeScale();
  }

  /**
   * Zoom out (centré sur le milieu du canvas)
   */
  public zoomOut() {
    const centerX = this.app.canvas.width / 2;
    const centerY = this.app.canvas.height / 2;
    const worldPos = this.viewport.toLocal({ x: centerX, y: centerY } as any);

    const newScale = Math.max(this.zoomState.minScale, this.zoomState.scale * 0.8);
    this.zoomState.scale = newScale;

    // Formule : newViewportPos = screenPos - worldPos * newScale
    this.viewport.x = centerX - worldPos.x * newScale;
    this.viewport.y = centerY - worldPos.y * newScale;
    this.viewport.scale.set(newScale);
    this.zoomState.x = this.viewport.x;
    this.zoomState.y = this.viewport.y;

    this.updateTimeScale();
  }

  /**
   * Reset view to default (zoom 1x, centered)
   */
  public resetView() {
    // Réinitialiser le zoom à 1x
    this.zoomState.scale = 1;
    this.viewport.scale.set(1);
    
    // Réinitialiser la position du viewport à (0, 0)
    // Cela remet le graphique à sa position d'origine
    this.viewport.x = 0;
    this.viewport.y = 0;
    this.zoomState.x = 0;
    this.zoomState.y = 0;

    // Mettre à jour l'échelle de temps
    this.updateTimeScale();
    
    // Redessiner le graphique pour s'assurer que les changements sont visibles
    // Cela garantit que tous les éléments sont correctement positionnés après le reset
    this.draw();
  }

  /**
   * Get current zoom level
   */
  public getZoomLevel(): number {
    return this.zoomState.scale;
  }

  /**
   * Détruit l'application PixiJS et libère toutes les ressources.
   * 
   * Cette méthode doit être appelée lors du démontage du composant pour éviter
   * les fuites mémoire. Elle détruit l'application PixiJS et tous ses éléments.
   */
  public destroy() {
    // Remove event listeners
    if (this.app.canvas && (this.app.canvas as any)._zoomPanHandlers) {
      const handlers = (this.app.canvas as any)._zoomPanHandlers;
      this.app.canvas.removeEventListener('wheel', handlers.wheel);
      this.app.canvas.removeEventListener('mousedown', handlers.mousedown);
      this.app.canvas.removeEventListener('mousemove', handlers.mousemove);
      this.app.canvas.removeEventListener('mouseup', handlers.mouseup);
      this.app.canvas.removeEventListener('mouseleave', handlers.mouseleave);
    }
    this.app.destroy();
  }
}
