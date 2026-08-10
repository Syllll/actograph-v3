import { BaseGraphic } from '../lib/base-graphic';
import { createTilingPatternSprite } from '../lib/pattern-textures';
import { pruneStaleCategoryEntries } from '../utils/category-graphics.utils';
/**
 * Per-layer storage for category-bound Graphics and tiling pattern sprites.
 */
export class CategoryGraphicsStore {
    constructor(app, container, patternStore) {
        this.app = app;
        this.container = container;
        this.patternStore = patternStore;
        this.graphicPerCategory = [];
        this.tilingSpritesPerCategory = [];
    }
    setContainer(container) {
        this.container = container;
    }
    /** Reset tracked graphics/sprites and paint into a fresh back buffer. */
    beginFullPaint(container) {
        this.destroyAllTracked();
        this.container = container;
    }
    getOrCreateGraphic(category) {
        let graphicEntry = this.graphicPerCategory.find((g) => g.category.id === category.id);
        if (!graphicEntry) {
            const graphic = new BaseGraphic(this.app);
            graphic.eventMode = 'none';
            this.container.addChild(graphic);
            graphicEntry = { category, graphic };
            this.graphicPerCategory.push(graphicEntry);
        }
        return graphicEntry.graphic;
    }
    findGraphic(categoryId) {
        return this.graphicPerCategory.find((g) => g.category.id === categoryId)?.graphic ?? null;
    }
    clearCategoryGraphic(categoryId) {
        const graphicEntry = this.graphicPerCategory.find((g) => g.category.id === categoryId);
        graphicEntry?.graphic.clear();
        this.clearTilingSpritesForCategoryId(categoryId);
    }
    clearTilingSpritesForCategory(category) {
        this.clearTilingSpritesForCategoryId(category.id);
    }
    clearTilingSpritesForCategoryId(categoryId) {
        const spriteEntry = this.tilingSpritesPerCategory.find((s) => s.category.id === categoryId);
        if (!spriteEntry) {
            return;
        }
        for (const spriteRecord of spriteEntry.sprites) {
            this.destroyTilingSpriteRecord(spriteRecord);
        }
        spriteEntry.sprites = [];
    }
    addTilingSprite(category, sprite, pattern, color) {
        let spriteEntry = this.tilingSpritesPerCategory.find((s) => s.category.id === category.id);
        if (!spriteEntry) {
            spriteEntry = { category, sprites: [] };
            this.tilingSpritesPerCategory.push(spriteEntry);
        }
        sprite.eventMode = 'none';
        spriteEntry.sprites.push({ sprite, pattern, color });
    }
    createTilingPatternSprite(pattern, color, x, y, width, height) {
        if (this.patternStore) {
            return this.patternStore.createTilingSprite(pattern, color, x, y, width, height);
        }
        return createTilingPatternSprite(pattern, color, x, y, width, height);
    }
    addTilingSpriteBehindGraphics(category, sprite, pattern, color) {
        this.container.addChildAt(sprite, 0);
        this.addTilingSprite(category, sprite, pattern, color);
    }
    destroyTilingSpriteRecord(spriteRecord) {
        this.container.removeChild(spriteRecord.sprite);
        spriteRecord.sprite.destroy();
        this.patternStore?.release(spriteRecord.pattern, spriteRecord.color);
    }
    pruneStaleCategoryGraphics(activeCategoryIds) {
        const orphanGraphics = pruneStaleCategoryEntries(this.graphicPerCategory, activeCategoryIds);
        for (const entry of orphanGraphics) {
            entry.graphic.clear();
            this.container.removeChild(entry.graphic);
            entry.graphic.destroy();
        }
        this.graphicPerCategory = this.graphicPerCategory.filter((entry) => activeCategoryIds.has(entry.category.id));
        const orphanSprites = pruneStaleCategoryEntries(this.tilingSpritesPerCategory, activeCategoryIds);
        for (const entry of orphanSprites) {
            for (const spriteRecord of entry.sprites) {
                this.destroyTilingSpriteRecord(spriteRecord);
            }
        }
        this.tilingSpritesPerCategory = this.tilingSpritesPerCategory.filter((entry) => activeCategoryIds.has(entry.category.id));
    }
    hasPatternSprites() {
        return this.tilingSpritesPerCategory.some((entry) => entry.sprites.length > 0);
    }
    clearAllPatternSprites() {
        for (const spriteEntry of this.tilingSpritesPerCategory) {
            for (const spriteRecord of spriteEntry.sprites) {
                this.destroyTilingSpriteRecord(spriteRecord);
            }
        }
        this.tilingSpritesPerCategory = [];
    }
    clearAll() {
        this.destroyAllTracked();
    }
    destroyAllTracked() {
        for (const graphicEntry of this.graphicPerCategory) {
            graphicEntry.graphic.clear();
            if (graphicEntry.graphic.parent) {
                graphicEntry.graphic.parent.removeChild(graphicEntry.graphic);
            }
            graphicEntry.graphic.destroy();
        }
        this.graphicPerCategory = [];
        this.clearAllPatternSprites();
    }
}
//# sourceMappingURL=CategoryGraphicsStore.js.map