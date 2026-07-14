import { Application, Graphics } from 'pixi.js';
import { computeDashedLineOps } from '../utils/dashed-line.utils';

/**
 * Classe de base étendant Graphics de PixiJS pour ajouter des fonctionnalités personnalisées.
 * 
 * Cette classe ajoute :
 * - Le suivi de la position du "stylo" graphique (_pen)
 * - Une méthode pour dessiner des lignes en pointillés (dashedLineTo)
 */
export class BaseGraphic extends Graphics {
  /** Référence à l'application PixiJS */
  protected app: Application;

  /** Position actuelle du "stylo" graphique */
  private _pen: { x: number; y: number } = { x: 0, y: 0 };

  constructor(app: Application) {
    super();
    this.app = app;
  }

  /**
   * Déplace le stylo graphique à une nouvelle position.
   */
  public moveTo(x: number, y: number) {
    const output = super.moveTo(x, y);
    this._pen.x = x;
    this._pen.y = y;
    return output;
  }

  /**
   * Dessine une ligne depuis la position actuelle jusqu'à une nouvelle position.
   */
  public lineTo(x: number, y: number) {
    const output = super.lineTo(x, y);
    this._pen.x = x;
    this._pen.y = y;
    return output;
  }

  /**
   * Dessine une ligne en pointillés depuis la position actuelle jusqu'à une destination.
   */
  public dashedLineTo(x2: number, y2: number, dash: number[] = [10, 5]) {
    const x1 = this._pen.x;
    const y1 = this._pen.y;

    for (const op of computeDashedLineOps(x1, y1, x2, y2, dash)) {
      if (op.type === 'move') {
        this.moveTo(op.x, op.y);
      } else {
        this.lineTo(op.x, op.y);
      }
    }

    this._pen.x = x2;
    this._pen.y = y2;

    return this;
  }
}

