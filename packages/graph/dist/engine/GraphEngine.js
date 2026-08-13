import { Container } from 'pixi.js';
import { DisplayModeEnum, mergeGraphPreferences, } from '@actograph/core';
import { getEffectiveDisplayMode } from '../utils/category-display.utils';
import { AxisLayer } from '../layers/AxisLayer';
import { BackgroundLayer } from '../layers/BackgroundLayer';
import { FriezeLayer } from '../layers/FriezeLayer';
import { SeriesLayer } from '../layers/SeriesLayer';
import { PauseOverlayLayer } from '../layers/PauseOverlayLayer';
export class GraphEngine {
    constructor(options) {
        this.lastDrawErrors = [];
        this.dataArea = options.dataArea;
        this.yAxis = options.yAxis;
        this.xAxis = options.xAxis;
        this.patternStore = options.patternStore;
        this.worldRoot = new Container();
        this.backgroundLayer = new BackgroundLayer(options.app, this.patternStore);
        this.friezeLayer = new FriezeLayer(options.app, this.patternStore);
        this.seriesLayer = new SeriesLayer(options.app, this.patternStore);
        this.pauseLayer = new PauseOverlayLayer(options.app);
        this.worldRoot.addChild(this.backgroundLayer.container);
        this.worldRoot.addChild(this.friezeLayer.container);
        this.worldRoot.addChild(this.seriesLayer.container);
        this.worldRoot.addChild(this.pauseLayer.container);
        const plotChildIndex = options.plot.getChildIndex(options.dataArea);
        options.plot.addChildAt(this.worldRoot, plotChildIndex);
        this.axisLayer = new AxisLayer(this.yAxis, this.xAxis);
    }
    buildContext() {
        const dataArea = this.dataArea;
        const yAxis = this.yAxis;
        const xAxis = this.xAxis;
        return {
            observation: dataArea.getObservation(),
            protocol: dataArea.getProtocol(),
            patternStore: this.patternStore,
            graphRenderOptions: dataArea.getGraphRenderOptions(),
            axisStretch: dataArea.getAxisStretch(),
            pausePeriods: dataArea.getPausePeriods(),
            readingsPerCategory: dataArea.getReadingsPerCategory(),
            getYPos: (categoryId, observableName) => {
                const scopedPos = yAxis.getPosFromCategoryObservable(categoryId, observableName);
                if (scopedPos >= 0) {
                    return scopedPos;
                }
                return yAxis.getPosFromLabel(observableName);
            },
            getDateTimePos: (date) => xAxis.getPosFromDateTime(date),
            getAxisBounds: () => {
                const yAxisStart = yAxis.getAxisStart();
                const yAxisEnd = yAxis.getAxisEnd();
                if (!yAxisStart || !yAxisEnd) {
                    return null;
                }
                const xAxisEnd = xAxis.getAxisEnd();
                if (typeof xAxisEnd?.x !== 'number') {
                    return null;
                }
                return {
                    bottomLeft: yAxisStart,
                    topRight: {
                        x: xAxisEnd.x,
                        y: yAxisEnd.y,
                    },
                };
            },
            getFriezeInfo: (categoryId) => yAxis.getFriezeInfo(categoryId),
            getObservablePreferences: (category, observableName) => this.getObservablePreferencesForReading(category, observableName),
            getCategoryById: (categoryId) => dataArea.getCategoryById(categoryId),
            getEffectiveDisplayMode,
        };
    }
    getLastDrawErrors() {
        return this.lastDrawErrors;
    }
    /**
     * Rebuilds the world scene into paint buffers, then commits atomically.
     * @returns false when axis bounds are unavailable (no commit; display unchanged).
     */
    prepareWorld() {
        const errors = [];
        const prepareOptions = {
            onCategoryError: (error) => errors.push(error),
        };
        const ctx = this.buildContext();
        // Axes first: getAxisStart/End are only set inside yAxis/xAxis.draw().
        // Checking bounds before that made the first (and every) prepareWorld
        // return early with an empty scene.
        this.axisLayer.prepare(ctx);
        const bounds = ctx.getAxisBounds();
        if (!bounds) {
            this.lastDrawErrors = errors;
            return false;
        }
        this.dataArea.prepareHitArea(bounds.bottomLeft, bounds.topRight);
        this.backgroundLayer.prepare(ctx, prepareOptions);
        this.friezeLayer.prepare(ctx, prepareOptions);
        this.seriesLayer.prepare(ctx, prepareOptions);
        this.pauseLayer.prepare(ctx);
        this.axisLayer.commit();
        this.backgroundLayer.commit();
        this.friezeLayer.commit();
        this.seriesLayer.commit();
        this.pauseLayer.commit();
        this.lastDrawErrors = errors;
        return true;
    }
    /**
     * Legacy teardown: destroys category graphics on the visible display buffer
     * immediately. Not wired from PixiApp; full-paint path uses prepareWorld only.
     */
    pruneStaleCategories(activeCategoryIds) {
        this.backgroundLayer.pruneStaleCategories(activeCategoryIds);
        this.friezeLayer.pruneStaleCategories(activeCategoryIds);
        this.seriesLayer.pruneStaleCategories(activeCategoryIds);
    }
    /**
     * Legacy teardown: destroys category graphics on the visible display buffer
     * immediately. Not used by the full-paint path (prepareWorld / commit).
     */
    clearCategoryAllLayers(categoryId) {
        this.backgroundLayer.clearCategory(categoryId);
        this.friezeLayer.clearCategory(categoryId);
        this.seriesLayer.clearCategory(categoryId);
    }
    redrawCategory(_categoryId) {
        return this.prepareWorld();
    }
    redrawObservable(_observableId) {
        return this.prepareWorld();
    }
    hasPatternSprites() {
        return this.backgroundLayer.hasPatternSprites() || this.friezeLayer.hasPatternSprites();
    }
    clearPatternSprites() {
        this.backgroundLayer.clearPatternSprites();
        this.friezeLayer.clearPatternSprites();
    }
    clearAll() {
        this.backgroundLayer.clearAll();
        this.friezeLayer.clearAll();
        this.seriesLayer.clearAll();
        this.pauseLayer.clear();
    }
    /** Legacy teardown — destroys display immediately; not used by full-paint path. */
    clearCategoryInOtherLayers(categoryId, mode) {
        if (mode !== DisplayModeEnum.Background) {
            this.backgroundLayer.clearCategory(categoryId);
        }
        if (mode !== DisplayModeEnum.Frieze) {
            this.friezeLayer.clearCategory(categoryId);
        }
        if (mode !== DisplayModeEnum.Normal) {
            this.seriesLayer.clearCategory(categoryId);
        }
    }
    getObservablePreferencesForReading(category, observableName) {
        const protocol = this.dataArea.getProtocol();
        if (!protocol || !category.children?.length || !observableName) {
            return null;
        }
        const observable = category.children.find((obs) => obs.name === observableName && obs.type === 'observable');
        if (!observable) {
            return null;
        }
        return mergeGraphPreferences(category.graphPreferences, observable.graphPreferences);
    }
}
//# sourceMappingURL=GraphEngine.js.map