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
    private destroyAxisLabels;
    /**
     * Met à jour le format d'affichage du temps. Ne touche ni aux bornes ni au
     * pas de temps de l'axe (calculés dans setData) : recalcule uniquement le
     * texte des labels déjà présents, pour permettre un changement de format à
     * chaud sans recharger l'observation.
     */
    setGraphRenderOptions(options: IGraphRenderOptions): void;
    /**
     * Largeur d'un texte pour le style des labels de tick, via un canvas 2D
     * hors-DOM réutilisé (measureText). Fallback grossier si `document` n'est
     * pas disponible (SSR).
     */
    private measureLabelWidth;
    /**
     * Espace vertical nécessaire sous la ligne de l'axe X pour contenir
     * entièrement les labels de tick, inclinés à 45°. `getRequiredHeight()` de
     * YAxis ne réservait qu'une marge fixe de 20px, insuffisante dès que les
     * labels dépassent quelques caractères (ex. format "Full" : 24 caractères)
     * — d'où le rognage observé en export PNG/JPEG quand le canvas est
     * redimensionné exactement à la hauteur "requise".
     */
    getRequiredBottomMargin(): number;
    /** Canvas hors-DOM réutilisé pour mesurer les labels (measureText), partagé entre instances. */
    private static measureCanvas;
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