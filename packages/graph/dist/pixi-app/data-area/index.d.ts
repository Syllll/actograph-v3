import { Application } from 'pixi.js';
import { BaseGroup } from '../../lib/base-group';
import type { IReading, IObservation, IProtocol, IPeriod } from '@actograph/core';
import { YAxis } from '../axis/y-axis';
import { xAxis } from '../axis/x-axis';
import { ProtocolItem } from '../../utils/protocol.utils';
import type { IGraphRenderOptions } from '../../types/graph-render-options';
import { type IPlotBounds } from '../../utils/crosshair.utils';
export interface IDataAreaHoverController {
    scheduleUpdateFromWorldPointer(input: {
        worldX: number;
        worldY: number;
        plotBoundsWorld: IPlotBounds;
        dateTime: Date;
        worldToOverlay: (p: {
            x: number;
            y: number;
        }) => {
            x: number;
            y: number;
        };
    }): void;
    dismiss(): void;
    clear(options?: {
        cancelPending?: boolean;
    }): void;
}
export type CategoryPruneHandler = (activeCategoryIds: Set<string>) => void;
export declare class DataArea extends BaseGroup {
    private yAxis;
    private xAxis;
    private graphInteractionEnabled;
    private plotContainer;
    private readingsPerCategory;
    private pointerHitArea;
    private hoverController;
    private worldToOverlay;
    private categoryPruneHandler;
    private protocol;
    protected observation: IObservation | null;
    private pausePeriods;
    private graphRenderOptions;
    private axisStretch;
    setAxisStretch(stretch: {
        x: number;
        y: number;
    }): void;
    getAxisStretch(): {
        x: number;
        y: number;
    };
    getObservation(): IObservation | null;
    getProtocol(): IProtocol | null;
    getPausePeriods(): readonly IPeriod[];
    getGraphRenderOptions(): IGraphRenderOptions;
    getReadingsPerCategory(): ReadonlyArray<{
        category: ProtocolItem;
        readings: IReading[];
    }>;
    getCategoryById(categoryId: string): ProtocolItem | null;
    setCategoryPruneHandler(handler: CategoryPruneHandler | null): void;
    constructor(app: Application, yAxis: YAxis, xAxis: xAxis, options?: {
        interactive?: boolean;
    });
    setHoverController(controller: IDataAreaHoverController | null): void;
    setWorldToOverlay(fn: ((p: {
        x: number;
        y: number;
    }) => {
        x: number;
        y: number;
    }) | null): void;
    setPlotContainer(plotContainer: import('pixi.js').Container): void;
    init(): void;
    private processPointerMove;
    setPausePeriods(periods: IPeriod[]): void;
    setGraphRenderOptions(options: IGraphRenderOptions): void;
    setProtocol(protocol: IProtocol): void;
    setData(observation: IObservation): void;
    clear(): void;
    draw(): void;
    prepareHitArea(bottomLeft: {
        x: number;
        y: number;
    }, topRight: {
        x: number;
        y: number;
    }): void;
    private getAxisBoundsFromAxes;
    getPlotBoundsLocal(): IPlotBounds | null;
}
//# sourceMappingURL=index.d.ts.map