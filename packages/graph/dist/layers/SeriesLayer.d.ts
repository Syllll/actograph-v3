import { Application, Container } from 'pixi.js';
import type { GraphContext } from '../engine/GraphContext';
import type { LayerPrepareOptions } from '../engine/types';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import { BaseLayer } from './Layer';
export declare class SeriesLayer extends BaseLayer {
    readonly container: Container;
    private readonly doubleBuffer;
    private readonly graphicsStore;
    constructor(app: Application, patternStore: PatternTextureStore);
    prepare(ctx: GraphContext, options?: LayerPrepareOptions): void;
    commit(): void;
    redrawCategory(categoryId: string, ctx: GraphContext): void;
    clearCategory(categoryId: string): void;
    pruneStaleCategories(activeCategoryIds: Set<string>): void;
    clearAll(): void;
    private getNormalCategories;
    private drawCategoryNormal;
}
//# sourceMappingURL=SeriesLayer.d.ts.map