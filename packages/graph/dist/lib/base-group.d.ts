import { Application, Container } from 'pixi.js';
import type { IObservation } from '@actograph/core';
/**
 * Classe de base abstraite pour tous les groupes d'éléments du graphique.
 */
export declare abstract class BaseGroup extends Container {
    /** Référence à l'application PixiJS */
    protected app: Application;
    /** Observation courante contenant les données à afficher */
    protected observation: IObservation | null;
    constructor(app: Application);
    /**
     * Méthode abstraite pour dessiner les éléments du groupe.
     */
    abstract draw(): void;
    /**
     * Configure les données de l'observation dans le groupe.
     */
    setData(observation: IObservation): void;
    /**
     * Efface tous les éléments graphiques du groupe.
     */
    clear(): void;
    /**
     * Méthode d'initialisation appelée après la création du groupe.
     */
    init(): void;
}
//# sourceMappingURL=base-group.d.ts.map