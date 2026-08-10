jest.mock('pixi.js', () => {
  class MockDisplayObject {
    eventMode = 'auto';
    children: unknown[] = [];
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    destroy() {}
    clear = jest.fn().mockReturnThis();
    rect = jest.fn().mockReturnThis();
    fill = jest.fn().mockReturnThis();
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
  };
});

import { Application } from 'pixi.js';
import { DisplayModeEnum } from '@actograph/core';
import { PauseOverlayLayer } from '../layers/PauseOverlayLayer';
import { FriezeLayer } from '../layers/FriezeLayer';
import { BaseGraphic } from '../lib/base-graphic';
import { createMockGraphContext } from './test-helpers/mock-graph-context';

describe('PauseOverlayLayer', () => {
  it('prepare does not call app.render', () => {
    const app = { render: jest.fn() } as unknown as Application;
    const layer = new PauseOverlayLayer(app);
    const ctx = createMockGraphContext({
      pausePeriods: [],
    });

    layer.prepare(ctx);

    expect(app.render).not.toHaveBeenCalled();
  });

  it('does not clear display graphic when axis bounds are missing', () => {
    const app = {} as Application;
    const layer = new PauseOverlayLayer(app);
    const displayGraphic = layer.container.children.find(
      (child) => (child as { visible: boolean }).visible !== false,
    ) as BaseGraphic;
    const clearSpy = jest.spyOn(displayGraphic, 'clear');

    const ctx = createMockGraphContext({
      getAxisBounds: () => null,
    });

    layer.prepare(ctx);
    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('prepare paints back buffer; commit swaps without clearing display', () => {
    const app = {} as Application;
    const layer = new PauseOverlayLayer(app);
    const ctx = createMockGraphContext({
      pausePeriods: [],
      getAxisBounds: () => ({
        bottomLeft: { x: 0, y: 100 },
        topRight: { x: 200, y: 0 },
      }),
    });

    const displayBefore = layer.container.children.find(
      (child) => (child as { visible: boolean }).visible !== false,
    ) as BaseGraphic;
    const displayClearSpy = jest.spyOn(displayBefore, 'clear');

    layer.prepare(ctx);
    expect(displayClearSpy).not.toHaveBeenCalled();

    layer.commit();
    displayClearSpy.mockRestore();
  });
});

describe('FriezeLayer double buffer', () => {
  it('prepare paints back buffer without clearing display', () => {
    const app = {} as Application;
    const layer = new FriezeLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);

    const ctx = createMockGraphContext({
      readingsPerCategory: [],
      getEffectiveDisplayMode: () => DisplayModeEnum.Frieze,
    });

    layer.prepare(ctx);
    layer.commit();

    const displayBefore = layer.container.children.find(
      (child) => (child as { visible: boolean }).visible !== false,
    ) as { children: unknown[] };
    const countBefore = displayBefore.children.length;

    layer.prepare(ctx);

    const displayAfter = layer.container.children.find(
      (child) => (child as { visible: boolean }).visible !== false,
    ) as { children: unknown[] };
    expect(displayAfter.children.length).toBe(countBefore);
  });
});
