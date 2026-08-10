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
    getChildIndex() {
      return 0;
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

import { Application, Container } from 'pixi.js';
import { GraphEngine } from '../engine/GraphEngine';
import type { DataArea } from '../pixi-app/data-area';

function createMockDataArea(): DataArea {
  return {
    getObservation: () => null,
    getProtocol: () => null,
    getGraphRenderOptions: () => ({}),
    getAxisStretch: () => ({ x: 1, y: 1 }),
    getPausePeriods: () => [],
    getReadingsPerCategory: () => [],
    getCategoryById: () => null,
    prepareHitArea: jest.fn(),
  } as unknown as DataArea;
}

function createMockAxis() {
  return {
    draw: jest.fn(),
    getAxisStart: () => ({ x: 0, y: 400 }),
    getAxisEnd: () => ({ x: 0, y: 0 }),
    getPosFromCategoryObservable: () => 100,
    getPosFromLabel: () => 100,
    getFriezeInfo: () => null,
  };
}

function createMockXAxis() {
  return {
    draw: jest.fn(),
    getAxisEnd: () => ({ x: 800, y: 400 }),
    getPosFromDateTime: () => 50,
  };
}

describe('GraphEngine', () => {
  it('prepareWorld draws axes before reading bounds (first paint)', () => {
    const app = {} as Application;
    const plot = new Container();
    const dataArea = createMockDataArea();
    plot.addChild(dataArea as unknown as Container);

    let axisStart: { x: number; y: number } | null = null;
    const yAxis = {
      draw: jest.fn(() => {
        axisStart = { x: 0, y: 400 };
      }),
      getAxisStart: () => (axisStart ? { ...axisStart } : null),
      getAxisEnd: () => (axisStart ? { x: 0, y: 0 } : null),
      getPosFromCategoryObservable: () => 100,
      getPosFromLabel: () => 100,
      getFriezeInfo: () => null,
    };
    const xAxis = {
      draw: jest.fn(),
      getAxisEnd: () => (axisStart ? { x: 800, y: 400 } : null),
      getPosFromDateTime: () => 50,
    };

    const engine = new GraphEngine({
      app,
      plot,
      dataArea,
      yAxis: yAxis as never,
      xAxis: xAxis as never,
      patternStore: { createTilingSprite: jest.fn(), release: jest.fn() } as never,
    });

    engine.prepareWorld();

    expect(yAxis.draw).toHaveBeenCalled();
    expect(xAxis.draw).toHaveBeenCalled();
    expect(dataArea.prepareHitArea).toHaveBeenCalledWith(
      { x: 0, y: 400 },
      { x: 800, y: 0 },
    );
  });

  it('prepareWorld calls axis draw then layers in order', () => {
    const app = {} as Application;
    const plot = new Container();
    const dataArea = createMockDataArea();
    plot.addChild(dataArea as unknown as Container);

    const yAxis = createMockAxis();
    const xAxis = createMockXAxis();
    const patternStore = {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    };

    const engine = new GraphEngine({
      app,
      plot,
      dataArea,
      yAxis: yAxis as never,
      xAxis: xAxis as never,
      patternStore: patternStore as never,
    });

    engine.prepareWorld();

    expect(dataArea.prepareHitArea).toHaveBeenCalled();
    expect(yAxis.draw).toHaveBeenCalled();
    expect(xAxis.draw).toHaveBeenCalled();
    expect(engine.worldRoot.children.length).toBe(4);
  });

  it('buildContext exposes axis bounds', () => {
    const app = {} as Application;
    const plot = new Container();
    const dataArea = createMockDataArea();
    plot.addChild(dataArea as unknown as Container);

    const engine = new GraphEngine({
      app,
      plot,
      dataArea,
      yAxis: createMockAxis() as never,
      xAxis: createMockXAxis() as never,
      patternStore: { createTilingSprite: jest.fn(), release: jest.fn() } as never,
    });

    const bounds = engine.buildContext().getAxisBounds();
    expect(bounds).toEqual({
      bottomLeft: { x: 0, y: 400 },
      topRight: { x: 800, y: 0 },
    });
  });
});
