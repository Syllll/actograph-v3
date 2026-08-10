import { Application, Container } from 'pixi.js';
import type { GraphContext } from './GraphContext';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import type { DataArea } from '../pixi-app/data-area';
import type { YAxis } from '../pixi-app/axis/y-axis';
import type { xAxis } from '../pixi-app/axis/x-axis';
import type { DrawError } from './types';
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
    private lastDrawErrors;
    constructor(options: GraphEngineOptions);
    buildContext(): GraphContext;
    getLastDrawErrors(): ReadonlyArray<DrawError>;
    prepareWorld(): void;
    /**
     * Legacy teardown: destroys category graphics on the visible display buffer
     * immediately. Not wired from PixiApp; full-paint path uses prepareWorld only.
     */
    pruneStaleCategories(activeCategoryIds: Set<string>): void;
    /**
     * Legacy teardown: destroys category graphics on the visible display buffer
     * immediately. Not used by the full-paint path (prepareWorld / commit).
     */
    clearCategoryAllLayers(categoryId: string): void;
    redrawCategory(_categoryId: string): void;
    redrawObservable(_observableId: string): void;
    hasPatternSprites(): boolean;
    clearPatternSprites(): void;
    clearAll(): void;
    /** Legacy teardown — destroys display immediately; not used by full-paint path. */
    private clearCategoryInOtherLayers;
    private getObservablePreferencesForReading;
}
//# sourceMappingURL=GraphEngine.d.ts.map