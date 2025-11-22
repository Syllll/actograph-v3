import { Application, Assets, Container, Sprite } from 'pixi.js';
import { xAxis } from './axis/x-axis';
import { IObservation, IReading } from '@services/observations/interface';
import { yAxis } from './axis/y-axis';
import { DataArea } from './data-area';

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
  
  /** Conteneur principal regroupant tous les éléments du graphique */
  private plot!: Container;
  
  /** Axe horizontal représentant le temps */
  private xAxis!: xAxis;
  
  /** Axe vertical représentant les observables */
  private yAxis!: yAxis;
  
  /** Zone centrale affichant les données (readings) */
  private dataArea!: DataArea;

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
    console.log('options.view', options.view);

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

    // Création du conteneur principal qui regroupe tous les éléments
    // Ce conteneur permet de manipuler l'ensemble du graphique comme un seul objet
    this.plot = new Container();
    this.plot.addChild(this.xAxis);
    this.plot.addChild(this.yAxis);
    this.plot.addChild(this.dataArea);

    // Ajout du conteneur principal à la scène PixiJS
    // La scène est le conteneur racine de tous les éléments affichés
    this.app.stage.addChild(this.plot);

    // Initialisation de chaque composant
    // Cette étape permet aux composants de configurer leurs événements, etc.
    this.yAxis.init();
    this.xAxis.init();
    this.dataArea.init();
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
   * Dessine tous les éléments du graphique.
   * 
   * Cette méthode appelle la méthode draw() de chaque composant dans l'ordre :
   * 1. Y-Axis (doit être dessiné en premier pour que X-Axis connaisse sa position)
   * 2. X-Axis (doit être dessiné avant DataArea pour connaître les positions temporelles)
   * 3. DataArea (dessine les données en utilisant les positions des axes)
   */
  public async draw() {
    this.yAxis.draw();
    this.xAxis.draw();
    this.dataArea.draw();
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
   * Détruit l'application PixiJS et libère toutes les ressources.
   * 
   * Cette méthode doit être appelée lors du démontage du composant pour éviter
   * les fuites mémoire. Elle détruit l'application PixiJS et tous ses éléments.
   */
  public destroy() {
    this.app.destroy();
  }
}
