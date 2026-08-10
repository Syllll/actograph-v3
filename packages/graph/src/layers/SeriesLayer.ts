import { Application, Container } from 'pixi.js';
import {
  DisplayModeEnum,
  ProtocolItemActionEnum,
  ReadingTypeEnum,
  resolveGraphColor,
} from '@actograph/core';
import type { GraphContext } from '../engine/GraphContext';
import type { CategoryReadingsEntry } from '../engine/GraphContext';
import { CategoryGraphicsStore } from '../engine/CategoryGraphicsStore';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import { BaseLayer } from './Layer';
import { LayerDoubleBuffer } from './LayerDoubleBuffer';
import {
  getContinuousSegmentStartIndices,
  shouldSkipInContinuousDraw,
} from '../utils/continuous-segments.utils';

export class SeriesLayer extends BaseLayer {
  readonly container: Container;
  private readonly doubleBuffer: LayerDoubleBuffer;
  private readonly graphicsStore: CategoryGraphicsStore;

  constructor(
    app: Application,
    patternStore: PatternTextureStore,
  ) {
    super('series');
    this.doubleBuffer = new LayerDoubleBuffer();
    this.container = this.doubleBuffer.root;
    this.graphicsStore = new CategoryGraphicsStore(app, this.doubleBuffer.paintBuffer, patternStore);
  }

  prepare(ctx: GraphContext): void {
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
      } catch (e) {
        console.warn(`Failed to draw normal category ${categoryEntry.category.name}:`, e);
      }
    }
  }

  commit(): void {
    this.doubleBuffer.commit();
    this.graphicsStore.setContainer(this.doubleBuffer.paintBuffer);
  }

  redrawCategory(categoryId: string, ctx: GraphContext): void {
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

  clearCategory(categoryId: string): void {
    this.graphicsStore.clearCategoryGraphic(categoryId);
  }

  pruneStaleCategories(activeCategoryIds: Set<string>): void {
    this.graphicsStore.pruneStaleCategoryGraphics(activeCategoryIds);
  }

  clearAll(): void {
    this.graphicsStore.clearAll();
  }

  private getNormalCategories(ctx: GraphContext): CategoryReadingsEntry[] {
    return ctx.readingsPerCategory.filter(
      (entry) => ctx.getEffectiveDisplayMode(entry.category) === DisplayModeEnum.Normal,
    );
  }

  private drawCategoryNormal(
    categoryEntry: CategoryReadingsEntry,
    ctx: GraphContext,
    axisEndX: number,
  ): void {
    const category = categoryEntry.category;
    const readings = [...categoryEntry.readings];
    const graphic = this.graphicsStore.getOrCreateGraphic(category);
    this.graphicsStore.clearTilingSpritesForCategory(category);

    const isDiscrete = category.action === ProtocolItemActionEnum.Discrete;

    if (isDiscrete) {
      graphic.clear();
      for (const reading of readings) {
        if (reading.type === ReadingTypeEnum.DATA) {
          const xPos = ctx.getDateTimePos(reading.dateTime);
          const yPos = ctx.getYPos(category.id, reading.name || '');
          if (yPos < 0) {
            continue;
          }

          const prefs = ctx.getObservablePreferences(category, reading.name || '');
          const color = resolveGraphColor(prefs);
          const strokeWidth = prefs?.strokeWidth ?? 4;

          graphic.ellipse(
            xPos,
            yPos,
            strokeWidth / 2 / ctx.axisStretch.x,
            strokeWidth / 2 / ctx.axisStretch.y,
          );
          graphic.setFillStyle({ color });
          graphic.fill();
        }
      }
      return;
    }

    const firstDataReading = readings.find(
      (reading) => reading.type === ReadingTypeEnum.DATA,
    );
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
    const minVisibleSegmentPx = 2;
    const newSegmentIndices = new Set(
      getContinuousSegmentStartIndices(readings).filter((idx) => idx > 0),
    );

    graphic.clear();

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
        if (xPos <= last.x) {
          xPos = last.x + minVisibleSegmentPx;
        }
        if (xPos > axisEndX) {
          xPos = axisEndX;
        }

        last.x = xPos;
        last.y = yPos;
        continue;
      }

      const yPos =
        reading.type === ReadingTypeEnum.STOP
          ? -1
          : ctx.getYPos(category.id, reading.name || '');

      let xPos = ctx.getDateTimePos(reading.dateTime);
      if (xPos <= last.x) {
        xPos = last.x + minVisibleSegmentPx;
      }
      if (xPos > axisEndX) {
        xPos = axisEndX;
      }

      const previousDataName =
        previousReading?.type === ReadingTypeEnum.DATA
          ? previousReading.name
          : firstDataReading.name || '';
      const horizontalPrefs = ctx.getObservablePreferences(
        category,
        previousDataName || firstDataReading.name || '',
      );
      const horizontalColor = resolveGraphColor(horizontalPrefs);
      const horizontalStrokeWidth = horizontalPrefs?.strokeWidth ?? 2;

      graphic.moveTo(last.x, last.y);
      graphic.lineTo(xPos, last.y);
      graphic.setStrokeStyle({
        color: horizontalColor,
        width: horizontalStrokeWidth,
      });
      graphic.stroke();

      if (yPos >= 0) {
        graphic.moveTo(xPos, last.y);
        graphic.lineTo(xPos, yPos);
        graphic.setStrokeStyle({
          color: 'grey',
          width: 1 / ctx.axisStretch.x,
        });
        graphic.stroke();
      }

      last.x = xPos;
      if (yPos >= 0) {
        last.y = yPos;
      }
    }
  }
}
