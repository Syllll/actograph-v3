jest.mock('pixi.js', () => ({
  Texture: {
    from: jest.fn(),
  },
  TilingSprite: jest.fn(),
}));

jest.mock('../gpu/pattern-canvas', () => ({
  createPatternCanvas: jest.fn(() => ({})),
}));

import { BackgroundPatternEnum } from '@actograph/core';
import { Texture } from 'pixi.js';
import { getPatternDescriptor } from '../gpu/pattern-descriptor';
import { DEFAULT_GRAPH_COLOR } from '../lib/graph-defaults';
import {
  PatternTextureStore,
  buildPatternCacheKey,
} from '../gpu/PatternTextureStore';

describe('buildPatternCacheKey', () => {
  it('normalizes color in the cache key', () => {
    const key = buildPatternCacheKey(BackgroundPatternEnum.Grid, '#abc');
    expect(key).toBe(`${BackgroundPatternEnum.Grid}-#aabbcc`);
  });
});

describe('PatternTextureStore', () => {
  function createFakeTexture(label: string): Texture {
    return {
      label,
      destroy: jest.fn(),
    } as unknown as Texture;
  }

  function createStore(): PatternTextureStore {
    let counter = 0;
    return new PatternTextureStore({
      textureFactory: () => {
        counter += 1;
        return createFakeTexture(`texture-${counter}`);
      },
    });
  }

  it('returns null for solid patterns', () => {
    const store = createStore();
    expect(store.acquire(BackgroundPatternEnum.Solid, '#ffffff')).toBeNull();
  });

  it.each([['abc', '#aabbcc'], ['invalid-color', DEFAULT_GRAPH_COLOR]])(
    'exports the same normalized color as the canvas for %s', (color, expected) => {
      const sprite = createStore().createTilingSprite(BackgroundPatternEnum.Grid, color, 0, 0, 80, 40);
      expect(sprite).not.toBeNull();
      expect(getPatternDescriptor(sprite!)).toEqual({ pattern: BackgroundPatternEnum.Grid, color: expected });
    },
  );

  it('caches textures per pattern and color', () => {
    const store = createStore();
    const first = store.acquire(BackgroundPatternEnum.Horizontal, '#ff0000');
    const second = store.acquire(BackgroundPatternEnum.Horizontal, '#ff0000');

    expect(first).toBe(second);
  });

  it('creates separate entries for different patterns or colors', () => {
    const store = createStore();
    const horizontal = store.acquire(BackgroundPatternEnum.Horizontal, '#ff0000');
    const vertical = store.acquire(BackgroundPatternEnum.Vertical, '#ff0000');
    const otherColor = store.acquire(BackgroundPatternEnum.Horizontal, '#00ff00');

    expect(horizontal).not.toBe(vertical);
    expect(horizontal).not.toBe(otherColor);
  });

  it('evict destroys all cached textures and clears the cache', () => {
    const store = createStore();
    const texture = store.acquire(BackgroundPatternEnum.Dots, '#123456');
    expect(texture).not.toBeNull();

    store.evict();

    expect(texture?.destroy).toHaveBeenCalledWith(true);
    const afterEvict = store.acquire(BackgroundPatternEnum.Dots, '#123456');
    expect(afterEvict).not.toBe(texture);
  });

  it('release removes texture when refCount reaches zero', () => {
    const store = createStore();
    const texture = store.acquire(BackgroundPatternEnum.Grid, '#abcdef');
    expect(texture).not.toBeNull();

    store.release(BackgroundPatternEnum.Grid, '#abcdef');
    expect(texture?.destroy).toHaveBeenCalledWith(true);

    const recreated = store.acquire(BackgroundPatternEnum.Grid, '#abcdef');
    expect(recreated).not.toBe(texture);
  });

  it('keeps texture alive until all releases', () => {
    const store = createStore();
    const texture = store.acquire(BackgroundPatternEnum.Diagonal, '#111111');
    store.acquire(BackgroundPatternEnum.Diagonal, '#111111');

    store.release(BackgroundPatternEnum.Diagonal, '#111111');
    expect(texture?.destroy).not.toHaveBeenCalled();

    store.release(BackgroundPatternEnum.Diagonal, '#111111');
    expect(texture?.destroy).toHaveBeenCalledWith(true);
  });

  it('isolates caches between store instances', () => {
    const storeA = createStore();
    const storeB = createStore();

    const textureA = storeA.acquire(BackgroundPatternEnum.Horizontal, '#ff00ff');
    const textureB = storeB.acquire(BackgroundPatternEnum.Horizontal, '#ff00ff');

    expect(textureA).not.toBe(textureB);

    storeA.evict();
    expect(textureA?.destroy).toHaveBeenCalledWith(true);
    expect(textureB?.destroy).not.toHaveBeenCalled();
  });
});
