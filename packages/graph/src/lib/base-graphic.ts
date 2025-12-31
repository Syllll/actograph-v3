import { Application, Graphics } from 'pixi.js';

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

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);

    if (len === 0) return this;
    
    const angle = Math.atan2(dy, dx);
    
    let dist = 0;
    let draw = true;
    let i = 0;
    
    while (dist < len) {
      const step = Math.min(dash[i % dash.length], len - dist);
      
      const nx = x1 + Math.cos(angle) * (dist + step);
      const ny = y1 + Math.sin(angle) * (dist + step);
      
      if (draw) {
        this.lineTo(nx, ny);
      } else {
        this.moveTo(nx, ny);
      }
      
      dist += step;
      draw = !draw;
      i++;
    }

    this._pen.x = x2;
    this._pen.y = y2;

    return this;
  }
}

