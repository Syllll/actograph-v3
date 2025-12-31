import { Texture, TilingSprite } from 'pixi.js';
import { BackgroundPatternEnum } from '@actograph/core';
/**
 * Crée une texture PixiJS à partir d'un pattern via Canvas.
 */
export declare function createPatternTexture(_app: unknown, pattern: BackgroundPatternEnum, color: string): Texture | null;
/**
 * Crée un TilingSprite qui répète le motif avec une échelle constante.
 */
export declare function createTilingPatternSprite(pattern: BackgroundPatternEnum, color: string, x: number, y: number, width: number, height: number): TilingSprite | null;
/**
 * Nettoie le cache des textures.
 */
export declare function clearPatternTextureCache(): void;
//# sourceMappingURL=pattern-textures.d.ts.map