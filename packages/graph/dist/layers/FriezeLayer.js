import { Container } from 'pixi.js';
import { BackgroundPatternEnum, DisplayModeEnum, ProtocolItemActionEnum, ReadingTypeEnum, resolveGraphColor, } from '@actograph/core';
import { CategoryGraphicsStore } from '../engine/CategoryGraphicsStore';
import { BaseLayer } from './Layer';
import { iterContinuousDataPairs } from '../utils/continuous-segments.utils';
export class FriezeLayer extends BaseLayer {
    constructor(app, patternStore) {
        super('frieze');
        this.container = new Container();
        this.graphicsStore = new CategoryGraphicsStore(app, this.container, patternStore);
    }
    prepare(ctx) {
        if (!ctx.getAxisBounds()) {
            return;
        }
        for (const categoryEntry of ctx.readingsPerCategory) {
            if (ctx.getEffectiveDisplayMode(categoryEntry.category) !== DisplayModeEnum.Frieze) {
                this.graphicsStore.clearCategoryGraphic(categoryEntry.category.id);
            }
        }
        for (const categoryEntry of this.getFriezeCategories(ctx)) {
            try {
                this.drawCategoryFrieze(categoryEntry, ctx);
            }
            catch (e) {
                console.warn(`Failed to draw frieze category ${categoryEntry.category.name}:`, e);
            }
        }
    }
    redrawCategory(categoryId, ctx) {
        const entry = ctx.readingsPerCategory.find((r) => r.category.id === categoryId);
        if (!entry) {
            return;
        }
        this.drawCategoryFrieze(entry, ctx);
    }
    clearCategory(categoryId) {
        this.graphicsStore.clearCategoryGraphic(categoryId);
    }
    pruneStaleCategories(activeCategoryIds) {
        this.graphicsStore.pruneStaleCategoryGraphics(activeCategoryIds);
    }
    hasPatternSprites() {
        return this.graphicsStore.hasPatternSprites();
    }
    clearPatternSprites() {
        this.graphicsStore.clearAllPatternSprites();
    }
    clearAll() {
        this.graphicsStore.clearAll();
    }
    getFriezeCategories(ctx) {
        return ctx.readingsPerCategory.filter((entry) => ctx.getEffectiveDisplayMode(entry.category) === DisplayModeEnum.Frieze);
    }
    drawCategoryFrieze(categoryEntry, ctx) {
        const category = categoryEntry.category;
        const readings = categoryEntry.readings;
        const graphic = this.graphicsStore.getOrCreateGraphic(category);
        this.graphicsStore.clearTilingSpritesForCategory(category);
        if (category.action === ProtocolItemActionEnum.Discrete) {
            const friezeInfo = ctx.getFriezeInfo(category.id);
            if (!friezeInfo) {
                return;
            }
            graphic.clear();
            for (const reading of readings) {
                if (reading.type === ReadingTypeEnum.DATA) {
                    const xPos = ctx.getDateTimePos(reading.dateTime);
                    const yPos = friezeInfo.centerY;
                    const prefs = ctx.getObservablePreferences(category, reading.name || '');
                    const color = resolveGraphColor(prefs);
                    const strokeWidth = prefs?.strokeWidth ?? 4;
                    graphic.ellipse(xPos, yPos, strokeWidth / 2 / ctx.axisStretch.x, strokeWidth / 2 / ctx.axisStretch.y);
                    graphic.setFillStyle({ color });
                    graphic.fill();
                }
            }
            return;
        }
        if (readings.length === 0) {
            return;
        }
        const friezeInfo = ctx.getFriezeInfo(category.id);
        if (!friezeInfo) {
            console.warn(`Frieze info not found for category ${category.id}`);
            return;
        }
        graphic.clear();
        const friezeTopY = friezeInfo.endY;
        const friezeHeight = friezeInfo.height;
        for (const { from, to } of iterContinuousDataPairs([...readings])) {
            const segmentStartX = ctx.getDateTimePos(from.dateTime);
            const segmentEndX = ctx.getDateTimePos(to.dateTime);
            const segmentWidth = segmentEndX - segmentStartX;
            if (segmentWidth <= 0) {
                continue;
            }
            const prefs = ctx.getObservablePreferences(category, from.name || '');
            const color = resolveGraphColor(prefs);
            const pattern = prefs?.backgroundPattern ??
                category.graphPreferences?.backgroundPattern ??
                BackgroundPatternEnum.Solid;
            if (pattern === BackgroundPatternEnum.Solid) {
                graphic
                    .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
                    .fill({ color, alpha: 1 });
                graphic
                    .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
                    .stroke({ color, width: 1 });
            }
            else {
                const tilingSprite = this.graphicsStore.createTilingPatternSprite(pattern, color, segmentStartX, friezeTopY, segmentWidth, friezeHeight);
                if (tilingSprite) {
                    this.graphicsStore.addTilingSpriteBehindGraphics(category, tilingSprite, pattern, color);
                }
                graphic
                    .rect(segmentStartX, friezeTopY, segmentWidth, friezeHeight)
                    .stroke({ color, width: 1 });
            }
        }
    }
}
//# sourceMappingURL=FriezeLayer.js.map