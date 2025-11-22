import { Application, Graphics } from 'pixi.js';

/**
 * Classe de base étendant Graphics de PixiJS pour ajouter des fonctionnalités personnalisées.
 * 
 * Cette classe ajoute :
 * - Le suivi de la position du "stylo" graphique (_pen)
 * - Une méthode pour dessiner des lignes en pointillés (dashedLineTo)
 * 
 * Le suivi de la position du stylo permet de dessiner des lignes en pointillés
 * en connaissant toujours la position actuelle, même après des opérations de dessin.
 */
export class BaseGraphic extends Graphics {
  /** Référence à l'application PixiJS */
  protected app: Application;

  /** 
   * Position actuelle du "stylo" graphique.
   * Cette position est mise à jour à chaque moveTo() ou lineTo() pour permettre
   * de dessiner des lignes en pointillés depuis la dernière position.
   */
  private _pen: {
    x: number;
    y: number;
  } = {
    x: 0,
    y: 0,
  };

  constructor(app: Application) {
    super();

    this.app = app;
  }

  /**
   * Déplace le stylo graphique à une nouvelle position.
   * 
   * Cette méthode surcharge moveTo() de Graphics pour mettre à jour
   * la position du stylo interne (_pen).
   * 
   * @param x - Position X
   * @param y - Position Y
   * @returns Instance de BaseGraphic pour le chaînage de méthodes
   */
  public moveTo(x: number, y: number) {
    const output = super.moveTo(x, y);
    this._pen.x = x;
    this._pen.y = y;
    return output;
  }

  /**
   * Dessine une ligne depuis la position actuelle jusqu'à une nouvelle position.
   * 
   * Cette méthode surcharge lineTo() de Graphics pour mettre à jour
   * la position du stylo interne (_pen).
   * 
   * @param x - Position X de destination
   * @param y - Position Y de destination
   * @returns Instance de BaseGraphic pour le chaînage de méthodes
   */
  public lineTo(x: number, y: number) {
    const output = super.lineTo(x, y);
    this._pen.x = x;
    this._pen.y = y;
    return output;
  }

  /**
   * Dessine une ligne en pointillés depuis la position actuelle jusqu'à une destination.
   * 
   * Cette méthode calcule une série de segments alternant entre dessin et espacement
   * selon le pattern de pointillés fourni (par défaut [10, 5] = 10px dessinés, 5px d'espace).
   * 
   * @param x2 - Position X de destination
   * @param y2 - Position Y de destination
   * @param dash - Pattern de pointillés [longueur dessinée, longueur espace, ...]
   * @returns Instance de BaseGraphic pour le chaînage de méthodes
   */
  public dashedLineTo(x2: number, y2: number, dash: number[] = [10, 5]) {
    const x1 = this._pen.x;
    const y1 = this._pen.y;

    // Calcul du vecteur et de la longueur de la ligne
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);

    // Si la longueur est nulle, pas besoin de dessiner
    if (len === 0) return this;
    
    // Calcul de l'angle de la ligne
    const angle = Math.atan2(dy, dx);
    
    // Parcours de la ligne en créant des segments selon le pattern
    let dist = 0;
    let draw = true; // Indique si on dessine ou on espace
    let i = 0;
    
    while (dist < len) {
      // Calcul de la longueur du segment actuel (pattern cyclique)
      const step = Math.min(dash[i % dash.length], len - dist);
      
      // Calcul de la position du point suivant
      const nx = x1 + Math.cos(angle) * (dist + step);
      const ny = y1 + Math.sin(angle) * (dist + step);
      
      // Dessin ou déplacement selon le pattern
      if (draw) {
        this.lineTo(nx, ny);
      } else {
        this.moveTo(nx, ny);
      }
      
      dist += step;
      draw = !draw; // Alternance entre dessin et espacement
      i++;
    }

    // Mise à jour de la position du stylo à la destination finale
    this._pen.x = x2;
    this._pen.y = y2;

    return this;
  }
}
