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
import { CategoryGraphicsStore } from '../engine/CategoryGraphicsStore';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import { BaseLayer } from './Layer';
import { LayerDoubleBuffer } from './LayerDoubleBuffer';
import type { CategoryReadingsEntry } from '../engine/GraphContext';
import { getBackgroundZoneForCategory } from '../utils/background-zone.utils';
import { iterContinuousDataPairs } from '../utils/continuous-segments.utils';
import { safeRect } from '../utils/safe-graphics.utils';

export class BackgroundLayer extends BaseLayer {
  readonly container: Container;
  private readonly doubleBuffer: LayerDoubleBuffer;
  private readonly graphicsStore: CategoryGraphicsStore;

  constructor(
    app: Application,
    patternStore: PatternTextureStore,
  ) {
    super('background');
    this.doubleBuffer = new LayerDoubleBuffer();
    this.container = this.doubleBuffer.root;
    this.graphicsStore = new CategoryGraphicsStore(app, this.doubleBuffer.paintBuffer, patternStore);
  }

  prepare(ctx: GraphContext, options?: LayerPrepareOptions): void {
    const bounds = ctx.getAxisBounds();
    if (!bounds) {
      return;
    }

    this.doubleBuffer.clearPaintBuffer();
    this.graphicsStore.beginFullPaint(this.doubleBuffer.paintBuffer);

    const { bottomLeft, topRight } = bounds;
    const fullZoneTopY = topRight.y;
    const fullZoneBottomY = bottomLeft.y;

    for (const categoryEntry of ctx.readingsPerCategory) {
      if (ctx.getEffectiveDisplayMode(categoryEntry.category) !== DisplayModeEnum.Background) {
        this.graphicsStore.clearCategoryGraphic(categoryEntry.category.id);
      }
    }

    for (const categoryEntry of this.getBackgroundCategories(ctx)) {
      try {
        this.drawCategoryBackground(categoryEntry, ctx, fullZoneTopY, fullZoneBottomY, options);
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
    const bounds = ctx.getAxisBounds();
    if (!bounds) {
      return;
    }
    this.drawCategoryBackground(
      entry,
      ctx,
      bounds.topRight.y,
      bounds.bottomLeft.y,
    );
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

  private getBackgroundCategories(ctx: GraphContext): CategoryReadingsEntry[] {
    const entries = ctx.readingsPerCategory.filter(
      (entry) =>
        isCategoryVisible(entry.category) &&
        ctx.getEffectiveDisplayMode(entry.category) === DisplayModeEnum.Background,
    );
    entries.sort((a, b) => {
      const aHasSupport = a.category.graphPreferences?.supportCategoryId ? 1 : 0;
      const bHasSupport = b.category.graphPreferences?.supportCategoryId ? 1 : 0;
      return aHasSupport - bHasSupport;
    });
    return entries;
  }

  private drawCategoryBackground(
    categoryEntry: CategoryReadingsEntry,
    ctx: GraphContext,
    fullZoneTopY: number,
    fullZoneBottomY: number,
    options?: LayerPrepareOptions,
  ): void {
    const category = categoryEntry.category;
    const readings = categoryEntry.readings;
    const graphic = this.graphicsStore.getOrCreateGraphic(category);

    if (category.action === ProtocolItemActionEnum.Discrete) {
      return;
    }

    if (readings.length === 0) {
      return;
    }

    const backgroundZone = getBackgroundZoneForCategory(
      ctx,
      category,
      fullZoneTopY,
      fullZoneBottomY,
    );
    const zoneTopY = backgroundZone.topY;
    const zoneHeight = backgroundZone.height;
    if (zoneHeight <= 0) {
      graphic.clear();
      this.graphicsStore.clearTilingSpritesForCategory(category);
      options?.onCategoryError?.({
        layerId: this.id,
        categoryId: category.id,
        categoryName: category.name,
        message: `Background skipped: zoneHeight=${zoneHeight}`,
      });
      return;
    }

    graphic.clear();
    this.graphicsStore.clearTilingSpritesForCategory(category);

    for (const { from, to } of iterContinuousDataPairs(readings)) {
      const startX = ctx.getDateTimePos(from.dateTime);
      const endX = ctx.getDateTimePos(to.dateTime);
      const zoneWidth = endX - startX;

      if (zoneWidth <= 0) {
        continue;
      }

      const prefs = ctx.getObservablePreferences(category, from.name || '');
      const color = resolveGraphColor(prefs);
      const pattern =
        prefs?.backgroundPattern ??
        category.graphPreferences?.backgroundPattern ??
        BackgroundPatternEnum.Solid;

      if (pattern === BackgroundPatternEnum.Solid) {
        safeRect(graphic, startX, zoneTopY, zoneWidth, zoneHeight, {
          fill: { color, alpha: 0.2 },
        });
      } else {
        const tilingSprite = this.graphicsStore.createTilingPatternSprite(
          pattern,
          color,
          startX,
          zoneTopY,
          zoneWidth,
          zoneHeight,
        );
        if (tilingSprite) {
          this.graphicsStore.addTilingSpriteBehindGraphics(category, tilingSprite, pattern, color);
        }
      }
    }
  }
}
