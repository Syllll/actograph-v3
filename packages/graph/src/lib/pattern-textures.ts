import { Texture, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum } from '@actograph/core';
import { PatternTextureStore } from '../gpu/PatternTextureStore';

const boundStores = new Set<PatternTextureStore>();
let legacyStore: PatternTextureStore | null = null;
let legacyWarningShown = false;

function getOrCreateLegacyStore(): PatternTextureStore {
  if (!legacyStore) {
    if (!legacyWarningShown) {
      console.warn(
        '[@actograph/graph] Using legacy module-scoped PatternTextureStore. '
        + 'Bind a per-instance store via bindPatternTextureStore() when GraphEngine is wired.',
      );
      legacyWarningShown = true;
    }
    legacyStore = new PatternTextureStore();
  }
  return legacyStore;
}

function resolveCompatStore(): PatternTextureStore {
  if (boundStores.size === 1) {
    return boundStores.values().next().value as PatternTextureStore;
  }
  return getOrCreateLegacyStore();
}

/**
 * @deprecated Use a per-instance PatternTextureStore from GraphEngine instead.
 */
export function getDefaultPatternTextureStore(): PatternTextureStore {
  return getOrCreateLegacyStore();
}

/**
 * @deprecated Use bindPatternTextureStore() instead.
 */
export function setPatternTextureStoreForCompat(store: PatternTextureStore | null): void {
  legacyStore = store;
}

export function bindPatternTextureStore(store: PatternTextureStore): void {
  boundStores.add(store);
}

export function unbindPatternTextureStore(store: PatternTextureStore): void {
  boundStores.delete(store);
}

/**
 * @deprecated Use PatternTextureStore.acquire() on a per-instance store instead.
 */
export function createPatternTexture(
  _app: unknown,
  pattern: BackgroundPatternEnum,
  color: string,
): Texture | null {
  return resolveCompatStore().acquire(pattern, color);
}

/**
 * @deprecated Use PatternTextureStore.createTilingSprite() on a per-instance store instead.
 */
export function createTilingPatternSprite(
  pattern: BackgroundPatternEnum,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
): TilingSprite | null {
  return resolveCompatStore().createTilingSprite(pattern, color, x, y, width, height);
}

/**
 * @deprecated Use PatternTextureStore.evict() on a per-instance store instead.
 */
export function clearPatternTextureCache(): void {
  if (boundStores.size === 1) {
    boundStores.values().next().value?.evict();
    return;
  }

  if (boundStores.size > 1) {
    for (const store of boundStores) {
      store.evict();
    }
    return;
  }

  getOrCreateLegacyStore().evict();
}
