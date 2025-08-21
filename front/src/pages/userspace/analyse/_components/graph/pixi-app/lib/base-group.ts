import { Application, Container } from 'pixi.js';
import { BaseGraphic } from './base-graphic';
import { IObservation } from '@services/observations/interface';

export abstract class BaseGroup extends Container {
  protected app: Application;
  protected observation: IObservation | null = null;

  constructor(app: Application) {
    super();

    this.app = app;
  }

  public abstract draw(): void;

  public setData(observation: IObservation) {
    this.observation = observation;
  }

  public clear() {
    for (const child of this.children) {
      if (child instanceof BaseGraphic) {
        child.clear();
      }
    }
  }

  public init() {
    // Do nothing
  }
}