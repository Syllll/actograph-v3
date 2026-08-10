import type { GraphContext } from '../engine/GraphContext';
import { mergeDirtyFlags } from '../engine/types';
import type { DirtyFlag, LayerId } from '../engine/types';
import { BaseLayer } from '../layers/Layer';
import { DisplayModeEnum } from '@actograph/core';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '../types/graph-render-options';

class TestLayer extends BaseLayer {
  prepareCount = 0;
  lastContext: GraphContext | null = null;

  constructor(id: LayerId) {
    super(id);
  }

  prepare(ctx: GraphContext): void {
    this.prepareCount += 1;
    this.lastContext = ctx;
  }

  getScope() {
    return this.invalidateScope;
  }
}

const mockContext: GraphContext = {
  observation: null,
  protocol: null,
  patternStore: {} as GraphContext['patternStore'],
  graphRenderOptions: { ...DEFAULT_GRAPH_RENDER_OPTIONS },
  axisStretch: { x: 1, y: 1 },
  pausePeriods: [],
  readingsPerCategory: [],
  getYPos: () => 0,
  getDateTimePos: () => 0,
  getAxisBounds: () => null,
  getFriezeInfo: () => null,
  getObservablePreferences: () => null,
  getCategoryById: () => null,
  getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
};

describe('BaseLayer', () => {
  it('starts clean', () => {
    const layer = new TestLayer('series');
    expect(layer.isDirty()).toBe(false);
    expect(layer.isUnsafeToPaint()).toBe(false);
    expect(layer.consumeDirty()).toBe('none');
  });

  it('marks dirty on invalidate', () => {
    const layer = new TestLayer('background');
    layer.invalidate('data');
    expect(layer.isDirty()).toBe(true);
  });

  it('merges dirty flags by priority', () => {
    const layer = new TestLayer('axis');

    layer.invalidate('viewport');
    layer.invalidate('style');
    expect(layer.consumeDirty()).toBe('style');

    layer.invalidate('data');
    layer.invalidate('layout');
    expect(layer.consumeDirty()).toBe('layout');

    layer.invalidate('viewport');
    layer.invalidate('full');
    expect(layer.consumeDirty()).toBe('full');
  });

  it('resets dirty flag after consumeDirty', () => {
    const layer = new TestLayer('hover');
    layer.invalidate('data');
    expect(layer.consumeDirty()).toBe('data');
    expect(layer.isDirty()).toBe(false);
    expect(layer.consumeDirty()).toBe('none');
  });

  it('stores invalidate scope until consumed', () => {
    const layer = new TestLayer('frieze');
    layer.invalidate('style', { categoryId: 'cat-1' });
    expect(layer.getScope()).toEqual({
      categoryId: 'cat-1',
    });
    layer.consumeDirty();
    expect(layer.getScope()).toBeUndefined();
  });

  it('tracks midDraw via isUnsafeToPaint', () => {
    const layer = new TestLayer('pause');
    expect(layer.isUnsafeToPaint()).toBe(false);
    layer.markMidDraw();
    expect(layer.isUnsafeToPaint()).toBe(true);
    layer.resetMidDraw();
    expect(layer.isUnsafeToPaint()).toBe(false);
  });

  it('prepare receives GraphContext', () => {
    const layer = new TestLayer('series');
    layer.prepare(mockContext);
    expect(layer.prepareCount).toBe(1);
    expect(layer.lastContext).toBe(mockContext);
  });
});

describe('mergeDirtyFlags', () => {
  const cases: Array<[DirtyFlag, DirtyFlag, DirtyFlag]> = [
    ['none', 'viewport', 'viewport'],
    ['style', 'data', 'data'],
    ['layout', 'data', 'layout'],
    ['full', 'layout', 'full'],
    ['viewport', 'viewport', 'viewport'],
  ];

  it.each(cases)('mergeDirtyFlags(%s, %s) => %s', (a, b, expected) => {
    expect(mergeDirtyFlags(a, b)).toBe(expected);
  });
});
