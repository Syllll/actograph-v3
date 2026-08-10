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
        this.retiredGraphics = [];
        this.retiredSprites = [];
    }
    setContainer(container) {
        this.container = container;
    }
    /** Paint into a back buffer; previous display objects stay alive until destroyRetired. */
    beginFullPaint(container) {
        this.retiredGraphics.push(...this.graphicPerCategory);
        this.graphicPerCategory = [];
        this.retiredSprites.push(...this.tilingSpritesPerCategory);
        this.tilingSpritesPerCategory = [];
        this.container = container;
    }
    /** Destroy display objects retired during the last beginFullPaint (after buffer swap). */
    destroyRetired() {
        for (const graphicEntry of this.retiredGraphics) {
            graphicEntry.graphic.clear();
            if (graphicEntry.graphic.parent) {
                graphicEntry.graphic.parent.removeChild(graphicEntry.graphic);
            }
            graphicEntry.graphic.destroy();
        }
        this.retiredGraphics = [];
        for (const spriteEntry of this.retiredSprites) {
            for (const spriteRecord of spriteEntry.sprites) {
                this.destroyTilingSpriteRecord(spriteRecord);
            }
        }
        this.retiredSprites = [];
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
        if (spriteRecord.sprite.parent) {
            spriteRecord.sprite.parent.removeChild(spriteRecord.sprite);
        }
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
        this.destroyRetired();
    }
}
//# sourceMappingURL=CategoryGraphicsStore.js.map