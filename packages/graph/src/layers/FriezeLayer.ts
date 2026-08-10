import { Application, Container } from 'pixi.js';
import {
  BackgroundPatternEnum,
  DisplayModeEnum,
  ProtocolItemActionEnum,
  ReadingTypeEnum,
  isCategoryVisible,
  resolveGraphColor,
} from '@actograph/core';
import type { GraphContext } from '../engine/GraphContext';
import type { LayerPrepareOptions } from '../engine/types';
import { toDrawErrorMessage } from '../engine/types';
import type { CategoryReadingsEntry } from '../engine/GraphContext';
import { CategoryGraphicsStore } from '../engine/CategoryGraphicsStore';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import { BaseLayer } from './Layer';
import { LayerDoubleBuffer } from './LayerDoubleBuffer';
import { iterContinuousDataPairs } from '../utils/continuous-segments.utils';
import { isFinitePoint, safeEllipse, safeRect } from '../utils/safe-graphics.utils';

export class FriezeLayer extends BaseLayer {
  readonly container: Container;
  private readonly doubleBuffer: LayerDoubleBuffer;
  private readonly graphicsStore: CategoryGraphicsStore;

  constructor(
    app: Application,
    patternStore: PatternTextureStore,
  ) {
    super('frieze');
    this.doubleBuffer = new LayerDoubleBuffer();
    this.container = this.doubleBuffer.root;
    this.graphicsStore = new CategoryGraphicsStore(app, this.doubleBuffer.paintBuffer, patternStore);
  }

  prepare(ctx: GraphContext, options?: LayerPrepareOptions): void {
    if (!ctx.getAxisBounds()) {
      return;
    }

    this.doubleBuffer.clearPaintBuffer();
    this.graphicsStore.beginFullPaint(this.doubleBuffer.paintBuffer);

    for (const categoryEntry of ctx.readingsPerCategory) {
      if (ctx.getEffectiveDisplayMode(categoryEntry.category) !== DisplayModeEnum.Frieze) {
        this.graphicsStore.clearCategoryGraphic(categoryEntry.category.id);
      }
    }

    for (const categoryEntry of this.getFriezeCategories(ctx)) {
      try {
        this.drawCategoryFrieze(categoryEntry, ctx, options);
      } catch (error) {
        options?.onCategoryError?.({
          layerId: this.id,
          categoryId: categoryEntry.category.id,
          categoryName: categoryEntry.category.name,
          message: toDrawErrorMessage(error),
        });
      }
    }
  }

  commit(): void {
    this.doubleBuffer.swap();
    this.graphicsStore.destroyRetired();
    this.doubleBuffer.clearBack();
    this.graphicsStore.setContainer(this.doubleBuffer.paintBuffer);
  }

  redrawCategory(categoryId: string, ctx: GraphContext): void {
    this.graphicsStore.setContainer(this.doubleBuffer.displayBuffer);
    const entry = ctx.readingsPerCategory.find((r) => r.category.id === categoryId);
    if (!entry) {
      return;
    }
    this.drawCategoryFrieze(entry, ctx);
  }

  clearCategory(categoryId: string): void {
    this.graphicsStore.clearCategoryGraphic(categoryId);
  }

  pruneStaleCategories(activeCategoryIds: Set<string>): void {
    this.graphicsStore.pruneStaleCategoryGraphics(activeCategoryIds);
  }

  hasPatternSprites(): boolean {
    return this.graphicsStore.hasPatternSprites();
  }

  clearPatternSprites(): void {
    this.graphicsStore.clearAllPatternSprites();
  }

  clearAll(): void {
    this.graphicsStore.clearAll();
  }

  private getFriezeCategories(ctx: GraphContext): CategoryReadingsEntry[] {
    return ctx.readingsPerCategory.filter(
      (entry) =>
        isCategoryVisible(entry.category) &&
        ctx.getEffectiveDisplayMode(entry.category) === DisplayModeEnum.Frieze,
    );
  }

  private drawCategoryFrieze(
    categoryEntry: CategoryReadingsEntry,
    ctx: GraphContext,
    options?: LayerPrepareOptions,
  ): void {
    const category = categoryEntry.category;
    const readings = categoryEntry.readings;
    const graphic = this.graphicsStore.getOrCreateGraphic(category);
    this.graphicsStore.clearTilingSpritesForCategory(category);

    if (category.action === ProtocolItemActionEnum.Discrete) {
      const friezeInfo = ctx.getFriezeInfo(category.id);
      if (!friezeInfo) {
        options?.onCategoryError?.({
          layerId: this.id,
          categoryId: category.id,
          categoryName: category.name,
          message: `Frieze info not found for category ${category.id}`,
        });
        return;
      }

      graphic.clear();

      for (const reading of readings) {
        if (reading.type === ReadingTypeEnum.DATA) {
          const xPos = ctx.getDateTimePos(reading.dateTime);
          const yPos = friezeInfo.centerY;
          if (!isFinitePoint(xPos, yPos)) {
            continue;
          }

          const prefs = ctx.getObservablePreferences(category, reading.name || '');
          const color = resolveGraphColor(prefs);
          const strokeWidth = prefs?.strokeWidth ?? 4;

          safeEllipse(
            graphic,
            xPos,
            yPos,
            strokeWidth / 2 / ctx.axisStretch.x,
            strokeWidth / 2 / ctx.axisStretch.y,
            { fill: { color } },
          );
        }
      }
      return;
    }

    if (readings.length === 0) {
      return;
    }

    const friezeInfo = ctx.getFriezeInfo(category.id);
    if (!friezeInfo) {
      options?.onCategoryError?.({
        layerId: this.id,
        categoryId: category.id,
        categoryName: category.name,
        message: `Frieze info not found for category ${category.id}`,
      });
      return;
    }

    graphic.clear();

    const friezeTopY = friezeInfo.endY;
    const friezeHeight = friezeInfo.height;

    for (const { from, to } of iterContinuousDataPairs(readings)) {
      const segmentStartX = ctx.getDateTimePos(from.dateTime);
      const segmentEndX = ctx.getDateTimePos(to.dateTime);
      const segmentWidth = segmentEndX - segmentStartX;

      if (segmentWidth <= 0) {
        continue;
      }

      const prefs = ctx.getObservablePreferences(category, from.name || '');
      const color = resolveGraphColor(prefs);
      const pattern =
        prefs?.backgroundPattern ??
        category.graphPreferences?.backgroundPattern ??
        BackgroundPatternEnum.Solid;

      if (pattern === BackgroundPatternEnum.Solid) {
        safeRect(graphic, segmentStartX, friezeTopY, segmentWidth, friezeHeight, {
          fill: { color, alpha: 1 },
        });

        safeRect(graphic, segmentStartX, friezeTopY, segmentWidth, friezeHeight, {
          stroke: { color, width: 1 },
        });
      } else {
        const tilingSprite = this.graphicsStore.createTilingPatternSprite(
          pattern,
          color,
          segmentStartX,
          friezeTopY,
          segmentWidth,
          friezeHeight,
        );
        if (tilingSprite) {
          this.graphicsStore.addTilingSpriteBehindGraphics(category, tilingSprite, pattern, color);
        }
        safeRect(graphic, segmentStartX, friezeTopY, segmentWidth, friezeHeight, {
          stroke: { color, width: 1 },
        });
      }
    }
  }
}
