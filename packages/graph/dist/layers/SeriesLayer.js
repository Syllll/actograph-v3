import { DisplayModeEnum, ProtocolItemActionEnum, ReadingTypeEnum, isCategoryVisible, resolveGraphColor, } from '@actograph/core';
import { toDrawErrorMessage } from '../engine/types';
import { CategoryGraphicsStore } from '../engine/CategoryGraphicsStore';
import { BaseLayer } from './Layer';
import { LayerDoubleBuffer } from './LayerDoubleBuffer';
import { getContinuousSegmentStartIndices, shouldSkipInContinuousDraw, } from '../utils/continuous-segments.utils';
import { isFinitePoint, safeEllipse, SafeStrokeBatch, } from '../utils/safe-graphics.utils';
export class SeriesLayer extends BaseLayer {
    constructor(app, patternStore) {
        super('series');
        this.doubleBuffer = new LayerDoubleBuffer();
        this.container = this.doubleBuffer.root;
        this.graphicsStore = new CategoryGraphicsStore(app, this.doubleBuffer.paintBuffer, patternStore);
    }
    prepare(ctx, options) {
        const bounds = ctx.getAxisBounds();
        if (!bounds) {
            return;
        }
        this.doubleBuffer.clearPaintBuffer();
        this.graphicsStore.beginFullPaint(this.doubleBuffer.paintBuffer);
        for (const categoryEntry of ctx.readingsPerCategory) {
            if (ctx.getEffectiveDisplayMode(categoryEntry.category) !== DisplayModeEnum.Normal) {
                this.graphicsStore.clearCategoryGraphic(categoryEntry.category.id);
            }
        }
        for (const categoryEntry of this.getNormalCategories(ctx)) {
            try {
                this.drawCategoryNormal(categoryEntry, ctx, bounds.topRight.x);
            }
            catch (error) {
                options?.onCategoryError?.({
                    layerId: this.id,
                    categoryId: categoryEntry.category.id,
                    categoryName: categoryEntry.category.name,
                    message: toDrawErrorMessage(error),
                });
            }
        }
    }
    commit() {
        this.doubleBuffer.swap();
        this.graphicsStore.destroyRetired();
        this.doubleBuffer.clearBack();
        this.graphicsStore.setContainer(this.doubleBuffer.paintBuffer);
    }
    redrawCategory(categoryId, ctx) {
        this.graphicsStore.setContainer(this.doubleBuffer.displayBuffer);
        const entry = ctx.readingsPerCategory.find((r) => r.category.id === categoryId);
        if (!entry) {
            return;
        }
        const bounds = ctx.getAxisBounds();
        if (!bounds) {
            return;
        }
        this.drawCategoryNormal(entry, ctx, bounds.topRight.x);
    }
    clearCategory(categoryId) {
        this.graphicsStore.clearCategoryGraphic(categoryId);
    }
    pruneStaleCategories(activeCategoryIds) {
        this.graphicsStore.pruneStaleCategoryGraphics(activeCategoryIds);
    }
    clearAll() {
        this.graphicsStore.clearAll();
    }
    getNormalCategories(ctx) {
        return ctx.readingsPerCategory.filter((entry) => isCategoryVisible(entry.category) &&
            ctx.getEffectiveDisplayMode(entry.category) === DisplayModeEnum.Normal);
    }
    drawCategoryNormal(categoryEntry, ctx, axisEndX) {
        const category = categoryEntry.category;
        const readings = categoryEntry.readings;
        const graphic = this.graphicsStore.getOrCreateGraphic(category);
        this.graphicsStore.clearTilingSpritesForCategory(category);
        const isDiscrete = category.action === ProtocolItemActionEnum.Discrete;
        if (isDiscrete) {
            graphic.clear();
            for (const reading of readings) {
                if (reading.type === ReadingTypeEnum.DATA) {
                    const xPos = ctx.getDateTimePos(reading.dateTime);
                    const yPos = ctx.getYPos(category.id, reading.name || '');
                    if (yPos < 0 || !isFinitePoint(xPos, yPos)) {
                        continue;
                    }
                    const prefs = ctx.getObservablePreferences(category, reading.name || '');
                    const color = resolveGraphColor(prefs);
                    const strokeWidth = prefs?.strokeWidth ?? 4;
                    safeEllipse(graphic, xPos, yPos, strokeWidth / 2 / ctx.axisStretch.x, strokeWidth / 2 / ctx.axisStretch.y, { fill: { color } });
                }
            }
            return;
        }
        const firstDataReading = readings.find((reading) => reading.type === ReadingTypeEnum.DATA);
        if (!firstDataReading) {
            return;
        }
        const startY = ctx.getYPos(category.id, firstDataReading.name || '');
        if (startY < 0) {
            return;
        }
        const start = {
            x: ctx.getDateTimePos(firstDataReading.dateTime),
            y: startY,
        };
        const last = { x: start.x, y: start.y };
        const newSegmentIndices = new Set(getContinuousSegmentStartIndices(readings).filter((idx) => idx > 0));
        graphic.clear();
        const horizontals = [];
        const verticals = [];
        for (let i = 1; i < readings.length; i++) {
            const reading = readings[i];
            if (!reading) {
                throw new Error('No reading found');
            }
            const previousReading = readings[i - 1];
            if (shouldSkipInContinuousDraw(reading, previousReading)) {
                continue;
            }
            if (reading.type === ReadingTypeEnum.DATA && newSegmentIndices.has(i)) {
                const yPos = ctx.getYPos(category.id, reading.name || '');
                if (yPos < 0) {
                    continue;
                }
                let xPos = ctx.getDateTimePos(reading.dateTime);
                if (!Number.isFinite(xPos)) {
                    continue;
                }
                // Collapsed or non-monotone timestamps: keep exact X (pure vertical).
                if (xPos < last.x) {
                    xPos = last.x;
                }
                if (xPos > axisEndX) {
                    xPos = axisEndX;
                }
                last.x = xPos;
                last.y = yPos;
                continue;
            }
            const yPos = reading.type === ReadingTypeEnum.STOP
                ? -1
                : ctx.getYPos(category.id, reading.name || '');
            let xPos = ctx.getDateTimePos(reading.dateTime);
            if (!Number.isFinite(xPos)) {
                continue;
            }
            if (xPos < last.x) {
                xPos = last.x;
            }
            if (xPos > axisEndX) {
                xPos = axisEndX;
            }
            const previousDataName = previousReading?.type === ReadingTypeEnum.DATA
                ? previousReading.name
                : firstDataReading.name || '';
            const horizontalPrefs = ctx.getObservablePreferences(category, previousDataName || firstDataReading.name || '');
            const horizontalColor = resolveGraphColor(horizontalPrefs);
            const horizontalStrokeWidth = horizontalPrefs?.strokeWidth ?? 2;
            horizontals.push({
                x1: last.x,
                y1: last.y,
                x2: xPos,
                y2: last.y,
                color: horizontalColor,
                width: horizontalStrokeWidth,
            });
            if (yPos >= 0) {
                verticals.push({ x1: xPos, y1: last.y, x2: xPos, y2: yPos });
            }
            last.x = xPos;
            if (yPos >= 0) {
                last.y = yPos;
            }
        }
        const horizontalGroups = new Map();
        for (const segment of horizontals) {
            const key = `${segment.color}|${segment.width}`;
            const group = horizontalGroups.get(key);
            if (group) {
                group.push(segment);
            }
            else {
                horizontalGroups.set(key, [segment]);
            }
        }
        const strokeBatch = new SafeStrokeBatch(graphic);
        const verticalStyle = { color: 'grey', width: 1 / ctx.axisStretch.x };
        for (const segments of horizontalGroups.values()) {
            for (const segment of segments) {
                strokeBatch.addLine(segment.x1, segment.y1, segment.x2, segment.y2, {
                    color: segment.color,
                    width: segment.width,
                });
            }
            strokeBatch.flush();
        }
        for (const segment of verticals) {
            strokeBatch.addLine(segment.x1, segment.y1, segment.x2, segment.y2, verticalStyle);
        }
        strokeBatch.flush();
    }
}
//# sourceMappingURL=SeriesLayer.js.map