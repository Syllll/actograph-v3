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
    /** True after beginFullPaint until finalizeCommit or discardUncommittedPaint. */
    private paintUncommitted;
    constructor(app: Application, container: Container, patternStore: PatternTextureStore | null);
    setContainer(container: Container): void;
    /**
     * Discard any uncommitted back-buffer paint, then clear the paint container
     * and retire the current display objects. Call this at the start of prepare
     * so a previous prepare that never committed cannot leave destroyed objects
     * in the registry.
     */
    beginPaintCycle(paintBuffer: Container, clearPaintBuffer: () => void): void;
    /** Paint into a back buffer; previous display objects stay alive until destroyRetired. */
    beginFullPaint(container: Container): void;
    /**
     * Destroy graphics from a prepare that never reached commit, and drop them
     * from the active registry before the paint buffer is cleared.
     */
    discardUncommittedPaint(): void;
    /** Destroy display objects retired during the last beginFullPaint (after buffer swap). */
    destroyRetired(): void;
    /** After buffer swap: drop retired display objects and mark the new paint as committed. */
    finalizeCommit(): void;
    getOrCreateGraphic(category: ProtocolItem): BaseGraphic;
    findGraphic(categoryId: string): BaseGraphic | null;
    clearCategoryGraphic(categoryId: string): void;
    clearTilingSpritesForCategory(category: ProtocolItem): void;
    private clearTilingSpritesForCategoryId;
    addTilingSprite(category: ProtocolItem, sprite: TilingSprite, pattern: BackgroundPatternEnum, color: string): void;
    createTilingPatternSprite(pattern: BackgroundPatternEnum, color: string, x: number, y: number, width: number, height: number): TilingSprite | null;
    addTilingSpriteBehindGraphics(category: ProtocolItem, sprite: TilingSprite, pattern: BackgroundPatternEnum, color: string): void;
    private destroyTilingSpriteRecord;
    private destroyGraphicSafe;
    private destroyActivePaintObjects;
    pruneStaleCategoryGraphics(activeCategoryIds: Set<string>): void;
    hasPatternSprites(): boolean;
    clearAllPatternSprites(): void;
    clearAll(): void;
    private destroyAllTracked;
}
//# sourceMappingURL=CategoryGraphicsStore.d.ts.map