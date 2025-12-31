import { Container } from 'pixi.js';
import { BaseGraphic } from './base-graphic';
/**
 * Classe de base abstraite pour tous les groupes d'éléments du graphique.
 */
export class BaseGroup extends Container {
    constructor(app) {
        super();
        /** Observation courante contenant les données à afficher */
        this.observation = null;
        this.app = app;
    }
    /**
     * Configure les données de l'observation dans le groupe.
     */
    setData(observation) {
        this.observation = observation;
    }
    /**
     * Efface tous les éléments graphiques du groupe.
     */
    clear() {
        for (const child of this.children) {
            if (child instanceof BaseGraphic) {
                child.clear();
            }
        }
    }
    /**
     * Méthode d'initialisation appelée après la création du groupe.
     */
    init() {
        // Do nothing
    }
}
//# sourceMappingURL=base-group.js.map