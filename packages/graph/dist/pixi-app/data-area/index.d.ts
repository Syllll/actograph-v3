import { Application } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import type { IObservation, IProtocol } from '@actograph/core';
import { YAxis } from '../axis/y-axis';
import { xAxis } from '../axis/x-axis';
export declare class DataArea extends BaseGroup {
    private yAxis;
    private xAxis;
    private readingsPerCategory;
    private graphicPerCategory;
    private tilingSpritesPerCategory;
    private graphicForBackground;
    private pointerDashedLines;
    private timeLabelContainer;
    private timeLabel;
    private timeLabelBackground;
    private protocol;
    protected observation: IObservation | null;
    constructor(app: Application, yAxis: YAxis, xAxis: xAxis);
    init(): void;
    setProtocol(protocol: IProtocol): void;
    setData(observation: IObservation): void;
    clear(): void;
    draw(): void;
    private getOrCreateGraphicForCategory;
    private drawCategoryNormal;
    private drawCategoryBackground;
    private clearTilingSpritesForCategory;
    private addTilingSpriteForCategory;
    private drawCategoryFrieze;
    private getObservablePreferencesForReading;
    redrawObservable(observableId: string): void;
}
//# sourceMappingURL=index.d.ts.map