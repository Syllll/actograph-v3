import { Application, Container } from 'pixi.js';
import { BaseGraphic } from './base-graphic';
import type { IObservation } from '@actograph/core';

/**
 * Classe de base abstraite pour tous les groupes d'éléments du graphique.
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
   */
  public abstract draw(): void;

  /**
   * Configure les données de l'observation dans le groupe.
   */
  public setData(observation: IObservation) {
    this.observation = observation;
  }

  /**
   * Efface tous les éléments graphiques du groupe.
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
   */
  public init() {
    // Do nothing
  }
}

