import type { TilingSprite } from 'pixi.js';
import type { BackgroundPatternEnum } from '@actograph/core';

export interface PatternDescriptor {
  pattern: BackgroundPatternEnum;
  color: string;
}

// Weak keys follow the lifetime of the committed scene, including buffer swaps.
const descriptors = new WeakMap<TilingSprite, PatternDescriptor>();

export function registerPatternDescriptor(sprite: TilingSprite, descriptor: PatternDescriptor): void {
  descriptors.set(sprite, descriptor);
}

export function getPatternDescriptor(sprite: TilingSprite): PatternDescriptor | undefined {
  return descriptors.get(sprite);
}
