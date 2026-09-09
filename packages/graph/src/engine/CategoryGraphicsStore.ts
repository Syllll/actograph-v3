import { Application, Container, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum } from '@actograph/core';
import { BaseGraphic } from '../lib/base-graphic';
import { createTilingPatternSprite } from '../lib/pattern-textures';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import type { ProtocolItem } from '../utils/protocol.utils';
import { pruneStaleCategoryEntries } from '../utils/category-graphics.utils';
import { isPixiDestroyed, PIXI_DESTROY_OWNED } from '../utils/display-object.utils';

export interface TilingSpriteRecord {
  sprite: TilingSprite;
  pattern: BackgroundPatternEnum;
  color: string;
}

/**
 * Per-layer storage for category-bound Graphics and tiling pattern sprites.
 */
export class CategoryGraphicsStore {
  private graphicPerCategory: { category: ProtocolItem; graphic: BaseGraphic }[] = [];
  private tilingSpritesPerCategory: {
    category: ProtocolItem;
    sprites: TilingSpriteRecord[];
  }[] = [];
  private retiredGraphics: { category: ProtocolItem; graphic: BaseGraphic }[] = [];
  private retiredSprites: {
    category: ProtocolItem;
    sprites: TilingSpriteRecord[];
  }[] = [];
  /** True after beginFullPaint until finalizeCommit or discardUncommittedPaint. */
  private paintUncommitted = false;

  constructor(
    private readonly app: Application,
    private container: Container,
    private readonly patternStore: PatternTextureStore | null,
  ) {}

  setContainer(container: Container): void {
    this.container = container;
  }

  /**
   * Discard any uncommitted back-buffer paint, then clear the paint container
   * and retire the current display objects. Call this at the start of prepare
   * so a previous prepare that never committed cannot leave destroyed objects
   * in the registry.
   */
  beginPaintCycle(paintBuffer: Container, clearPaintBuffer: () => void): void {
    this.discardUncommittedPaint();
    clearPaintBuffer();
    this.beginFullPaint(paintBuffer);
  }

  /** Paint into a back buffer; previous display objects stay alive until destroyRetired. */
  beginFullPaint(container: Container): void {
    this.retiredGraphics.push(...this.graphicPerCategory);
    this.graphicPerCategory = [];
    this.retiredSprites.push(...this.tilingSpritesPerCategory);
    this.tilingSpritesPerCategory = [];
    this.container = container;
    this.paintUncommitted = true;
  }

  /**
   * Destroy graphics from a prepare that never reached commit, and drop them
   * from the active registry before the paint buffer is cleared.
   */
  discardUncommittedPaint(): void {
    if (!this.paintUncommitted) {
      return;
    }
    this.destroyActivePaintObjects();
    this.paintUncommitted = false;
  }

  /** Destroy display objects retired during the last beginFullPaint (after buffer swap). */
  destroyRetired(): void {
    const graphics = this.retiredGraphics;
    this.retiredGraphics = [];
    for (const graphicEntry of graphics) {
      this.destroyGraphicSafe(graphicEntry.graphic);
    }

    const sprites = this.retiredSprites;
    this.retiredSprites = [];
    for (const spriteEntry of sprites) {
      for (const spriteRecord of spriteEntry.sprites) {
        this.destroyTilingSpriteRecord(spriteRecord);
      }
    }
  }

  /** After buffer swap: drop retired display objects and mark the new paint as committed. */
  finalizeCommit(): void {
    this.destroyRetired();
    this.paintUncommitted = false;
  }

  getOrCreateGraphic(category: ProtocolItem): BaseGraphic {
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

  findGraphic(categoryId: string): BaseGraphic | null {
    return this.graphicPerCategory.find((g) => g.category.id === categoryId)?.graphic ?? null;
  }

  clearCategoryGraphic(categoryId: string): void {
    const graphicEntry = this.graphicPerCategory.find((g) => g.category.id === categoryId);
    if (graphicEntry && !isPixiDestroyed(graphicEntry.graphic)) {
      graphicEntry.graphic.clear();
    }
    this.clearTilingSpritesForCategoryId(categoryId);
  }

  clearTilingSpritesForCategory(category: ProtocolItem): void {
    this.clearTilingSpritesForCategoryId(category.id);
  }

  private clearTilingSpritesForCategoryId(categoryId: string): void {
    const spriteEntry = this.tilingSpritesPerCategory.find((s) => s.category.id === categoryId);
    if (!spriteEntry) {
      return;
    }
    for (const spriteRecord of spriteEntry.sprites) {
      this.destroyTilingSpriteRecord(spriteRecord);
    }
    spriteEntry.sprites = [];
  }

  addTilingSprite(
    category: ProtocolItem,
    sprite: TilingSprite,
    pattern: BackgroundPatternEnum,
    color: string,
  ): void {
    let spriteEntry = this.tilingSpritesPerCategory.find((s) => s.category.id === category.id);
    if (!spriteEntry) {
      spriteEntry = { category, sprites: [] };
      this.tilingSpritesPerCategory.push(spriteEntry);
    }
    sprite.eventMode = 'none';
    spriteEntry.sprites.push({ sprite, pattern, color });
  }

  createTilingPatternSprite(
    pattern: BackgroundPatternEnum,
    color: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): TilingSprite | null {
    if (this.patternStore) {
      return this.patternStore.createTilingSprite(pattern, color, x, y, width, height);
    }
    return createTilingPatternSprite(pattern, color, x, y, width, height);
  }

  addTilingSpriteBehindGraphics(
    category: ProtocolItem,
    sprite: TilingSprite,
    pattern: BackgroundPatternEnum,
    color: string,
  ): void {
    this.container.addChildAt(sprite, 0);
    this.addTilingSprite(category, sprite, pattern, color);
  }

  private destroyTilingSpriteRecord(spriteRecord: TilingSpriteRecord): void {
    const sprite = spriteRecord.sprite;
    if (!isPixiDestroyed(sprite)) {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      if (!isPixiDestroyed(sprite)) {
        sprite.destroy(PIXI_DESTROY_OWNED);
      }
    }
    this.patternStore?.release(spriteRecord.pattern, spriteRecord.color);
  }

  private destroyGraphicSafe(graphic: BaseGraphic): void {
    if (isPixiDestroyed(graphic)) {
      return;
    }
    graphic.clear();
    if (graphic.parent) {
      graphic.parent.removeChild(graphic);
    }
    if (!isPixiDestroyed(graphic)) {
      graphic.destroy(PIXI_DESTROY_OWNED);
    }
  }

  private destroyActivePaintObjects(): void {
    const graphics = this.graphicPerCategory;
    this.graphicPerCategory = [];
    for (const graphicEntry of graphics) {
      this.destroyGraphicSafe(graphicEntry.graphic);
    }

    const sprites = this.tilingSpritesPerCategory;
    this.tilingSpritesPerCategory = [];
    for (const spriteEntry of sprites) {
      for (const spriteRecord of spriteEntry.sprites) {
        this.destroyTilingSpriteRecord(spriteRecord);
      }
    }
  }

  pruneStaleCategoryGraphics(activeCategoryIds: Set<string>): void {
    const orphanGraphics = pruneStaleCategoryEntries(
      this.graphicPerCategory,
      activeCategoryIds,
    );
    for (const entry of orphanGraphics) {
      this.destroyGraphicSafe(entry.graphic);
    }
    this.graphicPerCategory = this.graphicPerCategory.filter((entry) =>
      activeCategoryIds.has(entry.category.id),
    );

    const orphanSprites = pruneStaleCategoryEntries(
      this.tilingSpritesPerCategory,
      activeCategoryIds,
    );
    for (const entry of orphanSprites) {
      for (const spriteRecord of entry.sprites) {
        this.destroyTilingSpriteRecord(spriteRecord);
      }
    }
    this.tilingSpritesPerCategory = this.tilingSpritesPerCategory.filter((entry) =>
      activeCategoryIds.has(entry.category.id),
    );
  }

  hasPatternSprites(): boolean {
    return this.tilingSpritesPerCategory.some((entry) => entry.sprites.length > 0);
  }

  clearAllPatternSprites(): void {
    for (const spriteEntry of this.tilingSpritesPerCategory) {
      for (const spriteRecord of spriteEntry.sprites) {
        this.destroyTilingSpriteRecord(spriteRecord);
      }
    }
    this.tilingSpritesPerCategory = [];
  }

  clearAll(): void {
    this.destroyAllTracked();
  }

  private destroyAllTracked(): void {
    this.destroyActivePaintObjects();
    this.paintUncommitted = false;
    this.destroyRetired();
  }
}
