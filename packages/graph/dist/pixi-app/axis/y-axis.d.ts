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
    constructor(app: Application);
    getAxisStart(): IPosition | null;
    getAxisEnd(): IPosition | null;
    getPosFromLabel(label: string): number;
    getFriezeInfo(categoryId: string): {
        centerY: number;
        startY: number;
        endY: number;
        height: number;
    } | null;
    isCategoryBackground(categoryId: string): boolean;
    isCategoryFrieze(categoryId: string): boolean;
    getRequiredHeight(): number;
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
    private convertTicksToAbsolutePositions;
    private assertTickHasPosition;
}
export {};
//# sourceMappingURL=y-axis.d.ts.map