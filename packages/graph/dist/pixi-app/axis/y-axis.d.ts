import { Application } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import type { IObservation, IProtocolItem } from '@actograph/core';
interface IPosition {
    x: number;
    y: number;
}
export declare class YAxis extends BaseGroup {
    private readonly graphic;
    private ticks;
    private categories;
    private axisStart;
    private axisEnd;
    /**
     * Étirement par axe courant (voir PixiApp.axisStretch). Sert uniquement à
     * contre-scaler les labels pour qu'ils restent lisibles (non déformés) quand
     * scaleX ≠ scaleY sur le viewport parent. {1,1} = comportement identique à
     * avant (le zoom uniforme normal continue d'agrandir les labels comme avant).
     */
    private axisStretch;
    constructor(app: Application);
    setAxisStretch(stretch: {
        x: number;
        y: number;
    }): void;
    getAxisStart(): IPosition | null;
    getAxisEnd(): IPosition | null;
    getPosFromLabel(label: string): number;
    getPosFromCategoryObservable(categoryId: string, observableName: string): number;
    getFriezeInfo(categoryId: string): {
        centerY: number;
        startY: number;
        endY: number;
        height: number;
    } | null;
    isCategoryBackground(categoryId: string): boolean;
    isCategoryFrieze(categoryId: string): boolean;
    getRequiredHeight(): number;
    /**
     * Position Y de la ligne d'axe X (bas de la liste des catégories), sans
     * nécessiter un appel préalable à draw(). Utilisé par PixiApp pour calculer
     * la hauteur totale requise en tenant compte de la marge réelle des labels
     * d'axe X (voir xAxis.getRequiredBottomMargin()).
     */
    getAxisStartY(): number;
    setData(observation: IObservation): void;
    setProtocol(protocol: {
        items?: IProtocolItem[];
    }): void;
    clear(): void;
    draw(): void;
    /**
     * On mobile screens, a fixed 150px left offset wastes horizontal space when labels are short.
     * Estimate the needed label width and keep the offset adaptive, while preserving legacy spacing
     * on larger viewports.
     */
    private computeAxisOffsetX;
    private prepareForDraw;
    private drawAxisLine;
    private drawArrow;
    private drawTicks;
    private drawNormalTick;
    private drawFriezeTick;
    private createLabel;
    private removeLabels;
    private computeAxisLengthAndTicks;
    private getEffectiveDisplayMode;
    private convertTicksToAbsolutePositions;
    private assertTickHasPosition;
}
export {};
//# sourceMappingURL=y-axis.d.ts.map