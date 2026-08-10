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
import { DisplayModeEnum, ProtocolItemActionEnum, ReadingTypeEnum } from '@actograph/core';
import { BackgroundLayer } from '../layers/BackgroundLayer';
import { FriezeLayer } from '../layers/FriezeLayer';
import { SeriesLayer } from '../layers/SeriesLayer';
import { CategoryGraphicsStore } from '../engine/CategoryGraphicsStore';
import { createMockGraphContext } from './test-helpers/mock-graph-context';
import type { ProtocolItem } from '../utils/protocol.utils';
import * as safeGraphicsUtils from '../utils/safe-graphics.utils';
import * as backgroundZoneUtils from '../utils/background-zone.utils';

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

  it('reports zoneHeight <= 0 via onCategoryError', () => {
    const app = {} as Application;
    const layer = new BackgroundLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);

    const bgCategory = {
      id: 'cat-bg',
      name: 'Background Cat',
      type: 'category',
      action: ProtocolItemActionEnum.Continuous,
      children: [{ id: 'obs-1', name: 'On', type: 'observable' }],
    } as ProtocolItem;

    const ctx = createMockGraphContext({
      readingsPerCategory: [
        {
          category: bgCategory,
          readings: [
            { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T00:00:00Z'), name: 'On' },
            { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-02T00:00:00Z'), name: 'On' },
          ],
        },
      ],
      getEffectiveDisplayMode: () => DisplayModeEnum.Background,
      getDateTimePos: () => 100,
    });

    jest.spyOn(backgroundZoneUtils, 'getBackgroundZoneForCategory').mockReturnValue({
      topY: 50,
      height: 0,
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errors: import('../engine/types').DrawError[] = [];
    layer.prepare(ctx, {
      onCategoryError: (error) => errors.push(error),
    });

    expect(errors).toEqual([
      {
        layerId: 'background',
        categoryId: 'cat-bg',
        categoryName: 'Background Cat',
        message: 'Background skipped: zoneHeight=0',
      },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
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

  it('reports missing frieze info via onCategoryError', () => {
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
      readingsPerCategory: [
        {
          category: discreteCategory,
          readings: [
            { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T00:00:00Z'), name: 'On' },
          ],
        },
      ],
      getEffectiveDisplayMode: () => DisplayModeEnum.Frieze,
      getFriezeInfo: () => null,
      getDateTimePos: () => 100,
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errors: import('../engine/types').DrawError[] = [];
    layer.prepare(ctx, {
      onCategoryError: (error) => errors.push(error),
    });

    expect(errors).toEqual([
      {
        layerId: 'frieze',
        categoryId: discreteCategory.id,
        categoryName: discreteCategory.name,
        message: `Frieze info not found for category ${discreteCategory.id}`,
      },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
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

  it('skips invisible categories during prepare', () => {
    const app = {} as Application;
    const layer = new SeriesLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);
    const invisibleCategory = {
      ...category,
      graphPreferences: { visible: false },
    } as ProtocolItem;
    const ctx = createMockGraphContext({
      readingsPerCategory: [{ category: invisibleCategory, readings: [] }],
      getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
    });

    layer.prepare(ctx);

    const graphic = (
      layer as unknown as { graphicsStore: CategoryGraphicsStore }
    ).graphicsStore.findGraphic(invisibleCategory.id);
    expect(graphic).toBeNull();
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

  it('uses same X for collapsed timestamps without inventing horizontal offset', () => {
    const baseX = 150;
    const sameTime = new Date('2024-06-01T12:00:00.000Z');
    const strokeSpy = jest.spyOn(safeGraphicsUtils.SafeStrokeBatch.prototype, 'addLine');

    const continuousCategory = {
      id: 'cat-cont',
      name: 'Continuous',
      type: 'category',
      action: ProtocolItemActionEnum.Continuous,
      children: [
        { id: 'obs-off', name: 'Off', type: 'observable' },
        { id: 'obs-on', name: 'On', type: 'observable' },
      ],
    } as ProtocolItem;

    const readings = [
      {
        type: ReadingTypeEnum.DATA,
        dateTime: sameTime,
        name: 'Off',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: sameTime,
        name: 'On',
      },
    ];

    const app = {} as Application;
    const layer = new SeriesLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);

    const ctx = createMockGraphContext({
      readingsPerCategory: [{ category: continuousCategory, readings }],
      getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
      getDateTimePos: () => baseX,
      getYPos: (_categoryId: string, name: string) => (name === 'Off' ? 100 : 200),
    });

    layer.prepare(ctx);

    const inventedOffset = baseX + 2;
    const strokeCalls = strokeSpy.mock.calls.map((call) => ({
      x1: call[0] as number,
      y1: call[1] as number,
      x2: call[2] as number,
      y2: call[3] as number,
    }));

    expect(strokeCalls.some((s) => s.x1 === inventedOffset || s.x2 === inventedOffset)).toBe(
      false,
    );
    expect(strokeCalls.some((s) => s.x1 === baseX && s.x2 === baseX && s.y1 !== s.y2)).toBe(true);

    strokeSpy.mockRestore();
  });

  it('batches horizontal and vertical segments into few stroke() calls', () => {
    const continuousCategory = {
      id: 'cat-cont-batch',
      name: 'Continuous',
      type: 'category',
      action: ProtocolItemActionEnum.Continuous,
      children: [
        { id: 'obs-off', name: 'Off', type: 'observable' },
        { id: 'obs-on', name: 'On', type: 'observable' },
      ],
    } as ProtocolItem;

    const readings = [
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T00:00:00Z'),
        name: 'Off',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-02T00:00:00Z'),
        name: 'On',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-03T00:00:00Z'),
        name: 'Off',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-04T00:00:00Z'),
        name: 'On',
      },
      {
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-05T00:00:00Z'),
        name: 'Off',
      },
    ];

    const datePositions = new Map(
      readings.map((reading, index) => [reading.dateTime.getTime(), 100 + index * 50]),
    );

    const app = {} as Application;
    const layer = new SeriesLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);

    const ctx = createMockGraphContext({
      readingsPerCategory: [{ category: continuousCategory, readings }],
      getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
      getDateTimePos: (date: string | Date) => {
        const time =
          date instanceof Date ? date.getTime() : new Date(date).getTime();
        return datePositions.get(time) ?? 100;
      },
      getYPos: (_categoryId: string, name: string) => (name === 'Off' ? 100 : 200),
    });

    layer.prepare(ctx);

    const graphic = (
      layer as unknown as { graphicsStore: CategoryGraphicsStore }
    ).graphicsStore.findGraphic(continuousCategory.id);
    expect(graphic).not.toBeNull();

    const segmentCount = readings.length - 1;
    const strokeCalls = (graphic!.stroke as jest.Mock).mock.calls.length;
    const horizontalColorGroups = 1;
    const maxExpectedStrokes = horizontalColorGroups + 1;

    // Before double-pass batching: 2 strokes per segment (horizontal then vertical) = 8.
    expect(strokeCalls).toBeLessThan(2 * segmentCount);
    expect(strokeCalls).toBeLessThanOrEqual(maxExpectedStrokes);
    expect(strokeCalls).toBe(2);
  });
});
