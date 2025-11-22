import { Application, Container } from 'pixi.js';
import { BaseGraphic } from './base-graphic';
import { IObservation } from '@services/observations/interface';

/**
 * Classe de base abstraite pour tous les groupes d'éléments du graphique.
 * 
 * Cette classe étend Container de PixiJS et fournit :
 * - Une référence à l'application PixiJS
 * - Le stockage de l'observation courante
 * - Des méthodes communes pour gérer les données et le nettoyage
 * 
 * Toutes les classes de composants du graphique (yAxis, xAxis, DataArea) étendent
 * cette classe pour bénéficier de ces fonctionnalités communes.
 */
export abstract class BaseGroup extends Container {
  /** Référence à l'application PixiJS */
  protected app: Application;
  
  /** Observation courante contenant les données à afficher */
  protected observation: IObservation | null = null;

  constructor(app: Application) {
    super();

    this.app = app;
  }

  /**
   * Méthode abstraite pour dessiner les éléments du groupe.
   * 
   * Chaque classe fille doit implémenter cette méthode pour définir
   * comment elle dessine ses éléments sur le canvas.
   */
  public abstract draw(): void;

  /**
   * Configure les données de l'observation dans le groupe.
   * 
   * Cette méthode stocke l'observation pour qu'elle soit accessible
   * dans les méthodes de la classe. Les classes filles peuvent surcharger
   * cette méthode pour effectuer des traitements supplémentaires.
   * 
   * @param observation - Observation contenant les données à afficher
   */
  public setData(observation: IObservation) {
    this.observation = observation;
  }

  /**
   * Efface tous les éléments graphiques du groupe.
   * 
   * Cette méthode parcourt tous les enfants du conteneur et appelle clear()
   * sur ceux qui sont des instances de BaseGraphic.
   * Les classes filles peuvent surcharger cette méthode pour effectuer
   * des nettoyages supplémentaires (suppression de labels, réinitialisation de données, etc.).
   */
  public clear() {
    for (const child of this.children) {
      if (child instanceof BaseGraphic) {
        child.clear();
      }
    }
  }

  /**
   * Méthode d'initialisation appelée après la création du groupe.
   * 
   * Cette méthode peut être surchargée par les classes filles pour effectuer
   * des initialisations spécifiques (configuration d'événements, etc.).
   * Par défaut, elle ne fait rien.
   */
  public init() {
    // Do nothing
  }
}