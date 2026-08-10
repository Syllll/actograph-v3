import { Application, Container } from 'pixi.js';
import type { GraphContext } from './GraphContext';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import type { DataArea } from '../pixi-app/data-area';
import type { YAxis } from '../pixi-app/axis/y-axis';
import type { xAxis } from '../pixi-app/axis/x-axis';
export interface GraphEngineOptions {
    app: Application;
    plot: Container;
    dataArea: DataArea;
    yAxis: YAxis;
    xAxis: xAxis;
    patternStore: PatternTextureStore;
}
export declare class GraphEngine {
    readonly worldRoot: Container;
    private readonly dataArea;
    private readonly yAxis;
    private readonly xAxis;
    private readonly patternStore;
    private readonly axisLayer;
    private readonly backgroundLayer;
    private readonly friezeLayer;
    private readonly seriesLayer;
    private readonly pauseLayer;
    constructor(options: GraphEngineOptions);
    buildContext(): GraphContext;
    prepareWorld(): void;
    pruneStaleCategories(activeCategoryIds: Set<string>): void;
    clearCategoryAllLayers(categoryId: string): void;
    redrawCategory(categoryId: string): void;
    redrawObservable(observableId: string): void;
    hasPatternSprites(): boolean;
    clearPatternSprites(): void;
    clearAll(): void;
    private clearCategoryInOtherLayers;
    private getObservablePreferencesForReading;
}
//# sourceMappingURL=GraphEngine.d.ts.map