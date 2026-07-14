import { Graphics } from 'pixi.js';
import { computeDashedLineOps } from '../utils/dashed-line.utils';
/**
 * Classe de base étendant Graphics de PixiJS pour ajouter des fonctionnalités personnalisées.
 *
 * Cette classe ajoute :
 * - Le suivi de la position du "stylo" graphique (_pen)
 * - Une méthode pour dessiner des lignes en pointillés (dashedLineTo)
 */
export class BaseGraphic extends Graphics {
    constructor(app) {
        super();
        /** Position actuelle du "stylo" graphique */
        this._pen = { x: 0, y: 0 };
        this.app = app;
    }
    /**
     * Déplace le stylo graphique à une nouvelle position.
     */
    moveTo(x, y) {
        const output = super.moveTo(x, y);
        this._pen.x = x;
        this._pen.y = y;
        return output;
    }
    /**
     * Dessine une ligne depuis la position actuelle jusqu'à une nouvelle position.
     */
    lineTo(x, y) {
        const output = super.lineTo(x, y);
        this._pen.x = x;
        this._pen.y = y;
        return output;
    }
    /**
     * Dessine une ligne en pointillés depuis la position actuelle jusqu'à une destination.
     */
    dashedLineTo(x2, y2, dash = [10, 5]) {
        const x1 = this._pen.x;
        const y1 = this._pen.y;
        for (const op of computeDashedLineOps(x1, y1, x2, y2, dash)) {
            if (op.type === 'move') {
                this.moveTo(op.x, op.y);
            }
            else {
                this.lineTo(op.x, op.y);
            }
        }
        this._pen.x = x2;
        this._pen.y = y2;
        return this;
    }
}
//# sourceMappingURL=base-graphic.js.map