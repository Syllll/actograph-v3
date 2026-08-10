import { Application, Container, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum } from '@actograph/core';
import { BaseGraphic } from '../lib/base-graphic';
import { createTilingPatternSprite } from '../lib/pattern-textures';
import type { PatternTextureStore } from '../gpu/PatternTextureStore';
import type { ProtocolItem } from '../utils/protocol.utils';
import { pruneStaleCategoryEntries } from '../utils/category-graphics.utils';

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

  constructor(
    private readonly app: Application,
    private container: Container,
    private readonly patternStore: PatternTextureStore | null,
  ) {}

  setContainer(container: Container): void {
    this.container = container;
  }

  /** Paint into a back buffer; previous display objects stay alive until destroyRetired. */
  beginFullPaint(container: Container): void {
    this.retiredGraphics.push(...this.graphicPerCategory);
    this.graphicPerCategory = [];
    this.retiredSprites.push(...this.tilingSpritesPerCategory);
    this.tilingSpritesPerCategory = [];
    this.container = container;
  }

  /** Destroy display objects retired during the last beginFullPaint (after buffer swap). */
  destroyRetired(): void {
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
    graphicEntry?.graphic.clear();
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
    if (spriteRecord.sprite.parent) {
      spriteRecord.sprite.parent.removeChild(spriteRecord.sprite);
    }
    spriteRecord.sprite.destroy();
    this.patternStore?.release(spriteRecord.pattern, spriteRecord.color);
  }

  pruneStaleCategoryGraphics(activeCategoryIds: Set<string>): void {
    const orphanGraphics = pruneStaleCategoryEntries(
      this.graphicPerCategory,
      activeCategoryIds,
    );
    for (const entry of orphanGraphics) {
      entry.graphic.clear();
      this.container.removeChild(entry.graphic);
      entry.graphic.destroy();
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
