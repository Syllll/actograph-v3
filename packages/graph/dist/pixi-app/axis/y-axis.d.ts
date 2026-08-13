import { Application } from 'pixi.js';
import type { AxisLabelDescriptor } from '../../layers/AxisLabelOverlay';
import { BaseGroup } from '../../lib/base-group';
import type { IObservation, IProtocolItem } from '@actograph/core';
interface IPosition {
    x: number;
    y: number;
}
export declare class YAxis extends BaseGroup {
    private displayGraphic;
    private paintGraphic;
    /** Cible de dessin courante (paint buffer pendant beginPaint…commitPaint). */
    private graphic;
    private ticks;
    private categories;
    private axisStart;
    private axisEnd;
    /**
     * Étirement par axe courant (voir PixiApp.axisStretch). Utilisé pour les
     * marques de tick et la hauteur des frises en espace monde, pas pour les
     * labels (screen-space via AxisLabelOverlay).
     */
    private axisStretch;
    constructor(app: Application);
    beginPaint(): void;
    commitPaint(): void;
    setAxisStretch(stretch: {
        x: number;
        y: number;
    }): void;
    getAxisStart(): IPosition | null;
    getAxisEnd(): IPosition | null;
    /**
     * True when axis endpoints are set and stroke geometry or tick labels are
     * present. Used by hover to detect a cleared axis still referenced by stale
     * plot bounds (a stale framebuffer can hide the mismatch until hover).
     */
    hasDrawnContent(): boolean;
    /** True when the back buffer has stroke geometry ready to swap in. */
    hasPaintContent(): boolean;
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
    private drawAxisLine;
    private drawArrow;
    private drawTicks;
    private drawNormalTick;
    private drawFriezeTick;
    getLabelDescriptors(): AxisLabelDescriptor[];
    private computeAxisLengthAndTicks;
    private getEffectiveDisplayMode;
    private convertTicksToAbsolutePositions;
    private assertTickHasPosition;
}
export {};
//# sourceMappingURL=y-axis.d.ts.map