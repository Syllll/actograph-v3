jest.mock('pixi.js', () => {
  class MockDisplayObject {
    eventMode = 'auto';
    visible = true;
    x = 0;
    y = 0;
    angle = 0;
    rotation = 0;
    children: unknown[] = [];
    scale = { set: jest.fn() };
    bounds = { width: 10, height: 10 };
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    destroy() {}
    clear() {
      this.bounds = { width: 0, height: 0 };
      return this;
    }
    closePath() {
      return this;
    }
    fill() {
      this.bounds = { width: 10, height: 10 };
      return this;
    }
    setStrokeStyle() {
      return this;
    }
    moveTo() {
      this.bounds = { width: 10, height: 10 };
      return this;
    }
    lineTo() {
      this.bounds = { width: 10, height: 10 };
      return this;
    }
    stroke() {
      this.bounds = { width: 10, height: 10 };
      return this;
    }
    getLocalBounds() {
      return this.bounds;
    }
  }

  return {
    Application: class {},
    Container: MockDisplayObject,
    Graphics: MockDisplayObject,
  };
});

import { Application } from 'pixi.js';
import { AxisLayer } from '../layers/AxisLayer';
import { YAxis } from '../pixi-app/axis/y-axis';
import { BaseGraphic } from '../lib/base-graphic';

function createMockApp(): Application {
  return { screen: { width: 800, height: 600 } } as Application;
}

describe('YAxis double buffer', () => {
  it('beginPaint clears only the paint buffer, not the visible display', () => {
    const app = createMockApp();
    const yAxis = new YAxis(app);

    const graphics = yAxis.children.filter(
      (child): child is BaseGraphic => child instanceof BaseGraphic,
    );
    expect(graphics.length).toBe(2);

    const displayGraphic = graphics.find((child) => child.visible)!;
    const paintGraphic = graphics.find((child) => !child.visible)!;

    const displayClearSpy = jest.spyOn(displayGraphic, 'clear');
    const paintClearSpy = jest.spyOn(paintGraphic, 'clear');

    yAxis.beginPaint();

    expect(displayClearSpy).not.toHaveBeenCalled();
    expect(paintClearSpy).toHaveBeenCalledTimes(1);
  });

  it('commitPaint does not swap when the paint buffer has no geometry', () => {
    const app = createMockApp();
    const yAxis = new YAxis(app);

    const graphics = yAxis.children.filter(
      (child): child is BaseGraphic => child instanceof BaseGraphic,
    );
    const displayGraphic = graphics.find((child) => child.visible)!;
    const paintGraphic = graphics.find((child) => !child.visible)!;

    yAxis.beginPaint();
    yAxis.commitPaint();

    expect(displayGraphic.visible).toBe(true);
    expect(paintGraphic.visible).toBe(false);
  });

  it('commitPaint swaps when the paint buffer has geometry', () => {
    const app = createMockApp();
    const yAxis = new YAxis(app);

    const graphics = yAxis.children.filter(
      (child): child is BaseGraphic => child instanceof BaseGraphic,
    );
    const displayGraphic = graphics.find((child) => child.visible)!;
    const paintGraphic = graphics.find((child) => !child.visible)!;

    yAxis.beginPaint();
    paintGraphic.moveTo(0, 0);
    yAxis.commitPaint();

    expect(displayGraphic.visible).toBe(false);
    expect(paintGraphic.visible).toBe(true);
  });
});

describe('AxisLayer prepare', () => {
  it('draws both axes without committing in prepare', () => {
    const calls: string[] = [];
    const yAxis = {
      beginPaint: jest.fn(() => calls.push('y-beginPaint')),
      draw: jest.fn(() => calls.push('y-draw')),
      commitPaint: jest.fn(() => calls.push('y-commitPaint')),
    };
    const xAxis = {
      beginPaint: jest.fn(() => calls.push('x-beginPaint')),
      draw: jest.fn(() => calls.push('x-draw')),
      commitPaint: jest.fn(() => calls.push('x-commitPaint')),
    };

    const layer = new AxisLayer(yAxis as never, xAxis as never);
    layer.prepare({} as never);

    expect(calls).toEqual([
      'y-beginPaint',
      'y-draw',
      'x-beginPaint',
      'x-draw',
    ]);
    expect(yAxis.commitPaint).not.toHaveBeenCalled();
    expect(xAxis.commitPaint).not.toHaveBeenCalled();
  });

  it('commit applies both axis buffers after prepare', () => {
    const calls: string[] = [];
    const yAxis = {
      beginPaint: jest.fn(),
      draw: jest.fn(),
      commitPaint: jest.fn(() => calls.push('y-commitPaint')),
    };
    const xAxis = {
      beginPaint: jest.fn(),
      draw: jest.fn(),
      commitPaint: jest.fn(() => calls.push('x-commitPaint')),
    };

    const layer = new AxisLayer(yAxis as never, xAxis as never);
    layer.commit();

    expect(calls).toEqual(['y-commitPaint', 'x-commitPaint']);
  });

  it('does not commit when x draw throws', () => {
    const yAxis = {
      beginPaint: jest.fn(),
      draw: jest.fn(),
      commitPaint: jest.fn(),
    };
    const xAxis = {
      beginPaint: jest.fn(),
      draw: jest.fn(() => {
        throw new Error('x draw failed');
      }),
      commitPaint: jest.fn(),
    };

    const layer = new AxisLayer(yAxis as never, xAxis as never);
    expect(() => layer.prepare({} as never)).toThrow('x draw failed');

    expect(yAxis.commitPaint).not.toHaveBeenCalled();
    expect(xAxis.commitPaint).not.toHaveBeenCalled();
  });
});
