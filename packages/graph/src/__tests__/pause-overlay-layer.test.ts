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
import { PauseOverlayLayer } from '../layers/PauseOverlayLayer';
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

  it('clears graphic when axis bounds are missing', () => {
    const app = {} as Application;
    const layer = new PauseOverlayLayer(app);
    const ctx = createMockGraphContext({
      getAxisBounds: () => null,
    });

    layer.prepare(ctx);
    expect(layer.container.children.length).toBeGreaterThan(0);
  });
});
