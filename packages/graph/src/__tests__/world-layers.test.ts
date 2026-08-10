jest.mock('pixi.js', () => {
  class MockDisplayObject {
    eventMode = 'auto';
    children: unknown[] = [];
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    addChildAt(child: unknown, index: number) {
      this.children.splice(index, 0, child);
      return child;
    }
    removeChild(child: unknown) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) {
        this.children.splice(idx, 1);
      }
      return child;
    }
    destroy() {}
    clear = jest.fn().mockReturnThis();
    rect = jest.fn().mockReturnThis();
    fill = jest.fn().mockReturnThis();
    ellipse = jest.fn().mockReturnThis();
    setFillStyle = jest.fn().mockReturnThis();
    setStrokeStyle = jest.fn().mockReturnThis();
    moveTo = jest.fn().mockReturnThis();
    lineTo = jest.fn().mockReturnThis();
    stroke = jest.fn().mockReturnThis();
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
    TilingSprite: class extends MockDisplayObject {},
  };
});

import { Application } from 'pixi.js';
import { DisplayModeEnum, ProtocolItemActionEnum } from '@actograph/core';
import { BackgroundLayer } from '../layers/BackgroundLayer';
import { FriezeLayer } from '../layers/FriezeLayer';
import { SeriesLayer } from '../layers/SeriesLayer';
import { CategoryGraphicsStore } from '../engine/CategoryGraphicsStore';
import { createMockGraphContext } from './test-helpers/mock-graph-context';
import type { ProtocolItem } from '../utils/protocol.utils';

const category = {
  id: 'cat-1',
  name: 'Cat',
  type: 'category',
  children: [],
} as ProtocolItem;

describe('BackgroundLayer', () => {
  it('prepare does not call app.render', () => {
    const app = { render: jest.fn() } as unknown as Application;
    const layer = new BackgroundLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);
    const ctx = createMockGraphContext({
      readingsPerCategory: [{ category, readings: [] }],
      getEffectiveDisplayMode: () => DisplayModeEnum.Background,
    });

    layer.prepare(ctx);
    expect(app.render).not.toHaveBeenCalled();
  });
});

describe('FriezeLayer', () => {
  it('prepare does not call app.render', () => {
    const app = { render: jest.fn() } as unknown as Application;
    const layer = new FriezeLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);
    const ctx = createMockGraphContext({
      readingsPerCategory: [{ category, readings: [] }],
      getEffectiveDisplayMode: () => DisplayModeEnum.Frieze,
    });

    layer.prepare(ctx);
    expect(app.render).not.toHaveBeenCalled();
  });

  it('clears tiling sprites before discrete frieze draw', () => {
    const clearSpy = jest.spyOn(CategoryGraphicsStore.prototype, 'clearTilingSpritesForCategory');
    const app = {} as Application;
    const layer = new FriezeLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);

    const discreteCategory = {
      ...category,
      action: ProtocolItemActionEnum.Discrete,
    } as ProtocolItem;

    const ctx = createMockGraphContext({
      readingsPerCategory: [{ category: discreteCategory, readings: [] }],
      getEffectiveDisplayMode: () => DisplayModeEnum.Frieze,
      getFriezeInfo: () => ({ centerY: 10, startY: 15, endY: 20, height: 5 }),
    });

    layer.prepare(ctx);

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe('SeriesLayer', () => {
  it('prepare does not call app.render', () => {
    const app = { render: jest.fn() } as unknown as Application;
    const layer = new SeriesLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);
    const ctx = createMockGraphContext({
      readingsPerCategory: [{ category, readings: [] }],
      getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
    });

    layer.prepare(ctx);
    expect(app.render).not.toHaveBeenCalled();
  });

  it('clears graphics for non-normal categories', () => {
    const app = {} as Application;
    const layer = new SeriesLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);
    const ctx = createMockGraphContext({
      readingsPerCategory: [{ category, readings: [] }],
      getEffectiveDisplayMode: () => DisplayModeEnum.Background,
    });

    layer.prepare(ctx);
    expect(layer.container.children.length).toBe(2);
  });
});
