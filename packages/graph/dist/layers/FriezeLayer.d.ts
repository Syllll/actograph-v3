import { Application, Container } from 'pixi.js';
import type { GraphContext } from '../engine/GraphContext';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import { BaseLayer } from './Layer';
export declare class FriezeLayer extends BaseLayer {
    readonly container: Container;
    private readonly graphicsStore;
    constructor(app: Application, patternStore: PatternTextureStore);
    prepare(ctx: GraphContext): void;
    redrawCategory(categoryId: string, ctx: GraphContext): void;
    clearCategory(categoryId: string): void;
    pruneStaleCategories(activeCategoryIds: Set<string>): void;
    hasPatternSprites(): boolean;
    clearPatternSprites(): void;
    clearAll(): void;
    private getFriezeCategories;
    private drawCategoryFrieze;
}
//# sourceMappingURL=FriezeLayer.d.ts.map