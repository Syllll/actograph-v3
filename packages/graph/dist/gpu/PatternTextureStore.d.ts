import { Texture, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum } from '@actograph/core';
export declare function buildPatternCacheKey(pattern: BackgroundPatternEnum, color: string): string;
export interface PatternTextureStoreOptions {
    textureFactory?: (canvas: HTMLCanvasElement) => Texture;
}
export declare class PatternTextureStore {
    private readonly cache;
    private readonly textureFactory;
    constructor(options?: PatternTextureStoreOptions);
    acquire(pattern: BackgroundPatternEnum, color: string): Texture | null;
    release(pattern: BackgroundPatternEnum, color: string): void;
    createTilingSprite(pattern: BackgroundPatternEnum, color: string, x: number, y: number, width: number, height: number): TilingSprite | null;
    evict(): void;
}
//# sourceMappingURL=PatternTextureStore.d.ts.map