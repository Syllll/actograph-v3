import { Application } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import type { IObservation } from '@actograph/core';
import { YAxis } from './y-axis';
import type { IGraphRenderOptions } from '../../types/graph-render-options';
export declare class xAxis extends BaseGroup {
    private graphic;
    private readings;
    private labelsContainer;
    private yAxis;
    private pixelsPerMsec;
    private axisStartTimeInMsec;
    private axisEndTimeInMsec;
    /** Min/max timestamps from setData (START/STOP or sorted bounds) */
    private minTimeInMsec;
    private maxTimeInMsec;
    /** Total duration in ms for adaptive label formatting (Bug 3.9) */
    private totalDurationMs;
    private graphRenderOptions;
    private styleOptions;
    private ticks;
    private axisStart;
    private axisEnd;
    getAxisStart(): {
        x?: number | undefined;
        y?: number | undefined;
    };
    getAxisEnd(): {
        x?: number | undefined;
        y?: number | undefined;
    };
    constructor(app: Application, yAxis: YAxis);
    private getReadingTimeInMsec;
    getPosFromDateTime(dateTime: Date | string): number;
    getDateTimeFromPos(xPos: number): Date;
    clear(): void;
    /**
     * Met à jour le format d'affichage du temps. Ne touche ni aux bornes ni au
     * pas de temps de l'axe (calculés dans setData) : recalcule uniquement le
     * texte des labels déjà présents, pour permettre un changement de format à
     * chaud sans recharger l'observation.
     */
    setGraphRenderOptions(options: IGraphRenderOptions): void;
    private computeLabelForTick;
    /**
     * Mention de format affichée sous la flèche de fin d'axe (ex. "(hh:mn:sec)").
     * Uniquement pour un format fixe (pas Auto, adaptatif donc auto-descriptif)
     * en mode calendrier (le mode chronomètre porte déjà l'unité en toutes
     * lettres dans chaque valeur, ex. "62m03s" — pas d'ambiguïté à lever).
     */
    private getFormatMentionText;
    setData(observation: IObservation): void;
    draw(): void;
}
//# sourceMappingURL=x-axis.d.ts.map