import { Application, Container, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum } from '@actograph/core';
import { BaseGraphic } from '../lib/base-graphic';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import type { ProtocolItem } from '../utils/protocol.utils';
export interface TilingSpriteRecord {
    sprite: TilingSprite;
    pattern: BackgroundPatternEnum;
    color: string;
}
/**
 * Per-layer storage for category-bound Graphics and tiling pattern sprites.
 */
export declare class CategoryGraphicsStore {
    private readonly app;
    private container;
    private readonly patternStore;
    private graphicPerCategory;
    private tilingSpritesPerCategory;
    private retiredGraphics;
    private retiredSprites;
    constructor(app: Application, container: Container, patternStore: PatternTextureStore | null);
    setContainer(container: Container): void;
    /** Paint into a back buffer; previous display objects stay alive until destroyRetired. */
    beginFullPaint(container: Container): void;
    /** Destroy display objects retired during the last beginFullPaint (after buffer swap). */
    destroyRetired(): void;
    getOrCreateGraphic(category: ProtocolItem): BaseGraphic;
    findGraphic(categoryId: string): BaseGraphic | null;
    clearCategoryGraphic(categoryId: string): void;
    clearTilingSpritesForCategory(category: ProtocolItem): void;
    private clearTilingSpritesForCategoryId;
    addTilingSprite(category: ProtocolItem, sprite: TilingSprite, pattern: BackgroundPatternEnum, color: string): void;
    createTilingPatternSprite(pattern: BackgroundPatternEnum, color: string, x: number, y: number, width: number, height: number): TilingSprite | null;
    addTilingSpriteBehindGraphics(category: ProtocolItem, sprite: TilingSprite, pattern: BackgroundPatternEnum, color: string): void;
    private destroyTilingSpriteRecord;
    pruneStaleCategoryGraphics(activeCategoryIds: Set<string>): void;
    hasPatternSprites(): boolean;
    clearAllPatternSprites(): void;
    clearAll(): void;
    private destroyAllTracked;
}
//# sourceMappingURL=CategoryGraphicsStore.d.ts.map