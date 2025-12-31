import { Application, Graphics } from 'pixi.js';
/**
 * Classe de base étendant Graphics de PixiJS pour ajouter des fonctionnalités personnalisées.
 *
 * Cette classe ajoute :
 * - Le suivi de la position du "stylo" graphique (_pen)
 * - Une méthode pour dessiner des lignes en pointillés (dashedLineTo)
 */
export declare class BaseGraphic extends Graphics {
    /** Référence à l'application PixiJS */
    protected app: Application;
    /** Position actuelle du "stylo" graphique */
    private _pen;
    constructor(app: Application);
    /**
     * Déplace le stylo graphique à une nouvelle position.
     */
    moveTo(x: number, y: number): this;
    /**
     * Dessine une ligne depuis la position actuelle jusqu'à une nouvelle position.
     */
    lineTo(x: number, y: number): this;
    /**
     * Dessine une ligne en pointillés depuis la position actuelle jusqu'à une destination.
     */
    dashedLineTo(x2: number, y2: number, dash?: number[]): this;
}
//# sourceMappingURL=base-graphic.d.ts.map