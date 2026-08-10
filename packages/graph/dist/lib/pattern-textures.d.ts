import { Texture, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum } from '@actograph/core';
import { PatternTextureStore } from '../gpu/PatternTextureStore';
/**
 * @deprecated Use a per-instance PatternTextureStore from GraphEngine instead.
 */
export declare function getDefaultPatternTextureStore(): PatternTextureStore;
/**
 * @deprecated Use bindPatternTextureStore() instead.
 */
export declare function setPatternTextureStoreForCompat(store: PatternTextureStore | null): void;
export declare function bindPatternTextureStore(store: PatternTextureStore): void;
export declare function unbindPatternTextureStore(store: PatternTextureStore): void;
/**
 * @deprecated Use PatternTextureStore.acquire() on a per-instance store instead.
 */
export declare function createPatternTexture(_app: unknown, pattern: BackgroundPatternEnum, color: string): Texture | null;
/**
 * @deprecated Use PatternTextureStore.createTilingSprite() on a per-instance store instead.
 */
export declare function createTilingPatternSprite(pattern: BackgroundPatternEnum, color: string, x: number, y: number, width: number, height: number): TilingSprite | null;
/**
 * @deprecated Use PatternTextureStore.evict() on a per-instance store instead.
 */
export declare function clearPatternTextureCache(): void;
//# sourceMappingURL=pattern-textures.d.ts.map