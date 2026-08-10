import { Texture, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum, normalizeGraphColor } from '@actograph/core';
import { DEFAULT_GRAPH_COLOR } from '../lib/graph-defaults';
import { createPatternCanvas } from './pattern-canvas';

export function buildPatternCacheKey(pattern: BackgroundPatternEnum, color: string): string {
  const hexColor = normalizeGraphColor(color, DEFAULT_GRAPH_COLOR);
  return `${pattern}-${hexColor}`;
}

export interface PatternTextureStoreOptions {
  textureFactory?: (canvas: HTMLCanvasElement) => Texture;
}

interface CacheEntry {
  texture: Texture;
  refCount: number;
}

export class PatternTextureStore {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly textureFactory: (canvas: HTMLCanvasElement) => Texture;

  constructor(options: PatternTextureStoreOptions = {}) {
    this.textureFactory = options.textureFactory ?? ((canvas) => Texture.from(canvas));
  }

  acquire(pattern: BackgroundPatternEnum, color: string): Texture | null {
    if (pattern === BackgroundPatternEnum.Solid) {
      return null;
    }

    const cacheKey = buildPatternCacheKey(pattern, color);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.refCount += 1;
      return cached.texture;
    }

    try {
      const hexColor = normalizeGraphColor(color, DEFAULT_GRAPH_COLOR);
      const canvas = createPatternCanvas(pattern, hexColor);
      if (!canvas) {
        return null;
      }

      const texture = this.textureFactory(canvas);
      this.cache.set(cacheKey, { texture, refCount: 1 });
      return texture;
    } catch (error) {
      console.error(`Failed to create pattern texture for ${pattern} with color ${color}:`, error);
      return null;
    }
  }

  release(pattern: BackgroundPatternEnum, color: string): void {
    if (pattern === BackgroundPatternEnum.Solid) {
      return;
    }

    const cacheKey = buildPatternCacheKey(pattern, color);
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return;
    }

    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      entry.texture.destroy(true);
      this.cache.delete(cacheKey);
    }
  }

  createTilingSprite(
    pattern: BackgroundPatternEnum,
    color: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): TilingSprite | null {
    if (pattern === BackgroundPatternEnum.Solid) {
      return null;
    }

    const texture = this.acquire(pattern, color);
    if (!texture) {
      return null;
    }

    const tilingSprite = new TilingSprite({
      texture,
      width,
      height,
    });

    tilingSprite.x = x;
    tilingSprite.y = y;

    return tilingSprite;
  }

  evict(): void {
    for (const entry of this.cache.values()) {
      entry.texture.destroy(true);
    }
    this.cache.clear();
  }
}
