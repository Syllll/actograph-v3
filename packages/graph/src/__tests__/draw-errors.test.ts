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
    EventEmitter: class {
      private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
      on(event: string, fn: (...args: unknown[]) => void) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(fn);
      }
      off(event: string, fn: (...args: unknown[]) => void) {
        this.listeners.get(event)?.delete(fn);
      }
      emit(event: string, ...args: unknown[]) {
        for (const fn of this.listeners.get(event) ?? []) {
          fn(...args);
        }
      }
    },
  };
});

import { Application, Container } from 'pixi.js';
import { DisplayModeEnum, ProtocolItemActionEnum, ReadingTypeEnum } from '@actograph/core';
import { GraphEngine } from '../engine/GraphEngine';
import { SeriesLayer } from '../layers/SeriesLayer';
import { PixiApp } from '../pixi-app';
import type { DataArea } from '../pixi-app/data-area';
import { createMockGraphContext } from './test-helpers/mock-graph-context';
import type { ProtocolItem } from '../utils/protocol.utils';
import * as safeGraphicsUtils from '../utils/safe-graphics.utils';
import type { DrawError } from '../engine/types';

function patchPixiApp(
  pixiApp: PixiApp,
  patch: Record<string, unknown>,
): void {
  Object.assign(pixiApp as unknown as Record<string, unknown>, patch);
}

function createMutableScreenMock(initialWidth = 400, initialHeight = 300) {
  const screen = { width: initialWidth, height: initialHeight };
  const rect = { width: initialWidth, height: initialHeight, left: 0, top: 0 };
  const canvas = {
    getBoundingClientRect: jest.fn(() => ({ ...rect })),
    style: {} as CSSStyleDeclaration,
  };
  const resize = jest.fn((width: number, height: number) => {
    screen.width = width;
    screen.height = height;
  });

  return {
    screen,
    rect,
    canvas,
    app: {
      screen,
      canvas,
      renderer: { resize },
      render: jest.fn(),
    },
    resize,
  };
}

function createMockDataArea(): DataArea {
  const category = {
    id: 'cat-fail',
    name: 'Broken',
    type: 'category',
    action: ProtocolItemActionEnum.Continuous,
    children: [{ id: 'obs-1', name: 'On', type: 'observable' }],
  } as ProtocolItem;

  return {
    getObservation: () => null,
    getProtocol: () => null,
    getGraphRenderOptions: () => ({}),
    getAxisStretch: () => ({ x: 1, y: 1 }),
    getPausePeriods: () => [],
    getReadingsPerCategory: () => [
      {
        category,
        readings: [
          { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T00:00:00Z'), name: 'On' },
          { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-02T00:00:00Z'), name: 'On' },
        ],
      },
    ],
    getCategoryById: () => category,
    prepareHitArea: jest.fn(),
  } as unknown as DataArea;
}

function createMockAxis() {
  return {
    beginPaint: jest.fn(),
    draw: jest.fn(),
    commitPaint: jest.fn(),
    getAxisStart: () => ({ x: 0, y: 400 }),
    getAxisEnd: () => ({ x: 0, y: 0 }),
    getPosFromCategoryObservable: () => 100,
    getPosFromLabel: () => 100,
    getFriezeInfo: () => null,
    getLabelDescriptors: () => [],
  };
}

function createMockXAxis() {
  return {
    beginPaint: jest.fn(),
    draw: jest.fn(),
    commitPaint: jest.fn(),
    getAxisEnd: () => ({ x: 800, y: 400 }),
    getPosFromDateTime: () => 50,
    getLabelDescriptors: () => [],
  };
}

describe('category draw errors', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('SeriesLayer reports category errors via onCategoryError', () => {
    const app = {} as Application;
    const layer = new SeriesLayer(app, {
      createTilingSprite: jest.fn(),
      release: jest.fn(),
    } as never);

    const category = {
      id: 'cat-1',
      name: 'Cat',
      type: 'category',
      action: ProtocolItemActionEnum.Continuous,
      children: [{ id: 'obs-off', name: 'Off', type: 'observable' }],
    } as ProtocolItem;

    const ctx = createMockGraphContext({
      readingsPerCategory: [
        {
          category,
          readings: [
            { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T00:00:00Z'), name: 'Off' },
            { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-02T00:00:00Z'), name: 'On' },
          ],
        },
      ],
      getEffectiveDisplayMode: () => DisplayModeEnum.Normal,
      getDateTimePos: () => 100,
      getYPos: () => 50,
    });

    const strokeSpy = jest
      .spyOn(safeGraphicsUtils.SafeStrokeBatch.prototype, 'addLine')
      .mockImplementation(() => {
        throw new Error('boom');
      });

    const errors: DrawError[] = [];
    layer.prepare(ctx, {
      onCategoryError: (error) => errors.push(error),
    });

    expect(errors).toEqual([
      {
        layerId: 'series',
        categoryId: 'cat-1',
        categoryName: 'Cat',
        message: 'boom',
      },
    ]);
    strokeSpy.mockRestore();
  });

  it('GraphEngine.prepareWorld collects layer category errors', () => {
    const app = {} as Application;
    const plot = new Container();
    const dataArea = {
      ...createMockDataArea(),
      getReadingsPerCategory: () => [],
    } as unknown as DataArea;
    plot.addChild(dataArea as unknown as Container);

    const engine = new GraphEngine({
      app,
      plot,
      dataArea,
      yAxis: createMockAxis() as never,
      xAxis: createMockXAxis() as never,
      patternStore: { createTilingSprite: jest.fn(), release: jest.fn() } as never,
    });

    jest.spyOn(SeriesLayer.prototype, 'prepare').mockImplementation((_ctx, options) => {
      options?.onCategoryError?.({
        layerId: 'series',
        categoryId: 'cat-fail',
        categoryName: 'Broken',
        message: 'series failed',
      });
    });

    engine.prepareWorld();

    expect(engine.getLastDrawErrors()).toEqual([
      {
        layerId: 'series',
        categoryId: 'cat-fail',
        categoryName: 'Broken',
        message: 'series failed',
      },
    ]);
  });
});

describe('PixiApp draw error surface', () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      // Do not auto-run: failure tests assert scheduling separately.
      void cb;
      return 1;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((id: number) => {
      void id;
    }) as typeof cancelAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
  });

  it('emitDrawErrors emits drawErrors with the full list (empty on success)', () => {
    const pixiApp = new PixiApp();
    const drawErrorsHandler = jest.fn();

    pixiApp.events.on('drawErrors', drawErrorsHandler);
    (pixiApp as unknown as { emitDrawErrors: (errors: DrawError[]) => void }).emitDrawErrors([]);

    expect(drawErrorsHandler).toHaveBeenCalledWith([]);
    expect(pixiApp.lastDrawErrors).toEqual([]);
  });

  it('emitDrawErrors emits drawErrors with category errors', () => {
    const pixiApp = new PixiApp();
    const drawErrorsHandler = jest.fn();
    const errors: DrawError[] = [
      {
        layerId: 'series',
        categoryId: 'cat-1',
        categoryName: 'Cat',
        message: 'boom',
      },
    ];

    pixiApp.events.on('drawErrors', drawErrorsHandler);
    (pixiApp as unknown as { emitDrawErrors: (errors: DrawError[]) => void }).emitDrawErrors(errors);

    expect(drawErrorsHandler).toHaveBeenCalledWith(errors);
    expect(pixiApp.lastDrawErrors).toEqual(errors);
  });

  it('executeDrawBody clears pattern sprites before evicting textures', async () => {
    const pixiApp = new PixiApp();
    const clearPatternSprites = jest.fn();
    const evict = jest.fn();
    const callOrder: string[] = [];

    clearPatternSprites.mockImplementation(() => {
      callOrder.push('clearPatternSprites');
    });
    evict.mockImplementation(() => {
      callOrder.push('evict');
    });

    patchPixiApp(pixiApp, {
      isInitialized: true,
      contextRestoring: false,
      app: { renderer: {}, render: jest.fn() },
      plot: { x: 0, y: 0, scale: { set: jest.fn() }, rotation: 0 },
      hoverLayer: { clear: jest.fn() },
      axisLabelOverlay: { sync: jest.fn() },
      needsPatternTextureRefresh: true,
      forcePatternTextureClear: false,
      patternStore: { evict },
      isInteractive: false,
      dirtyRegistry: {
        markAllMidDraw: jest.fn(),
        resetAllMidDraw: jest.fn(),
        invalidateAll: jest.fn(),
      },
      graphEngine: {
        hasPatternSprites: jest.fn(() => true),
        clearPatternSprites,
        prepareWorld: jest.fn(() => true),
        getLastDrawErrors: jest.fn(() => []),
      },
      updateWorldTransforms: jest.fn(),
      syncAxisLabelOverlay: jest.fn(),
    });

    await (
      pixiApp as unknown as { executeDrawBody: () => Promise<void> }
    ).executeDrawBody();

    expect(clearPatternSprites).toHaveBeenCalledTimes(1);
    expect(evict).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['clearPatternSprites', 'evict']);
  });

  it('executeDrawBody clears pattern sprites when forcePatternTextureClear even without sprites', async () => {
    const pixiApp = new PixiApp();
    const clearPatternSprites = jest.fn();
    const evict = jest.fn();
    const callOrder: string[] = [];

    clearPatternSprites.mockImplementation(() => {
      callOrder.push('clearPatternSprites');
    });
    evict.mockImplementation(() => {
      callOrder.push('evict');
    });

    patchPixiApp(pixiApp, {
      isInitialized: true,
      contextRestoring: false,
      app: { renderer: {}, render: jest.fn() },
      plot: { x: 0, y: 0, scale: { set: jest.fn() }, rotation: 0 },
      hoverLayer: { clear: jest.fn() },
      axisLabelOverlay: { sync: jest.fn() },
      needsPatternTextureRefresh: true,
      forcePatternTextureClear: true,
      patternStore: { evict },
      isInteractive: false,
      dirtyRegistry: {
        markAllMidDraw: jest.fn(),
        resetAllMidDraw: jest.fn(),
        invalidateAll: jest.fn(),
      },
      graphEngine: {
        hasPatternSprites: jest.fn(() => false),
        clearPatternSprites,
        prepareWorld: jest.fn(() => true),
        getLastDrawErrors: jest.fn(() => []),
      },
      updateWorldTransforms: jest.fn(),
      syncAxisLabelOverlay: jest.fn(),
    });

    await (
      pixiApp as unknown as { executeDrawBody: () => Promise<void> }
    ).executeDrawBody();

    expect(clearPatternSprites).toHaveBeenCalledTimes(1);
    expect(evict).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['clearPatternSprites', 'evict']);
    expect(
      (pixiApp as unknown as { forcePatternTextureClear: boolean }).forcePatternTextureClear,
    ).toBe(false);
  });

  it('resizeFromCanvas on non-interactive path calls requestRender not app.render', () => {
    const pixiApp = new PixiApp();
    const mock = createMutableScreenMock(400, 300);
    const requestRender = jest.fn();

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: false,
      exportInProgress: false,
      wasDegenerateCanvas: false,
      app: mock.app,
      requestRender,
    });

    mock.rect.width = 800;
    mock.rect.height = 600;

    const didResize = pixiApp.resizeFromCanvas();

    expect(didResize).toBe(true);
    expect(mock.resize).toHaveBeenCalledWith(800, 600);
    expect(requestRender).toHaveBeenCalledTimes(1);
    expect(mock.app.render).not.toHaveBeenCalled();
  });

  it('executeDrawBody failure keeps axis labels and records full draw error', async () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }) as typeof requestAnimationFrame;

    const pixiApp = new PixiApp();
    const axisClear = jest.fn();
    const drawErrorsHandler = jest.fn();
    const render = jest.fn();

    patchPixiApp(pixiApp, {
      isInitialized: true,
      contextRestoring: false,
      app: { renderer: {}, render },
      plot: { x: 0, y: 0, scale: { set: jest.fn() }, rotation: 0 },
      hoverLayer: { clear: jest.fn() },
      axisLabelOverlay: { clear: axisClear, sync: jest.fn() },
      needsPatternTextureRefresh: false,
      isInteractive: false,
      dirtyRegistry: {
        markAllMidDraw: jest.fn(),
        resetAllMidDraw: jest.fn(),
        invalidateAll: jest.fn(),
      },
      graphEngine: {
        prepareWorld: jest.fn(() => {
          throw new Error('prepare failed');
        }),
        getLastDrawErrors: jest.fn(() => []),
        hasPatternSprites: jest.fn(() => false),
        clearPatternSprites: jest.fn(),
      },
    });

    pixiApp.events.on('drawErrors', drawErrorsHandler);

    try {
      await expect(
        (pixiApp as unknown as { executeDrawBody: () => Promise<void> }).executeDrawBody(),
      ).rejects.toThrow('prepare failed');

      expect(axisClear).not.toHaveBeenCalled();
      expect(pixiApp.lastDrawErrors).toEqual([
        { layerId: 'full', message: 'prepare failed' },
      ]);
      expect(drawErrorsHandler).toHaveBeenCalledWith([
        { layerId: 'full', message: 'prepare failed' },
      ]);
      expect(render).not.toHaveBeenCalled();
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });

  it('executeDrawBody failure schedules a single auto-retry via rAF', async () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }) as typeof requestAnimationFrame;

    const pixiApp = new PixiApp();
    const render = jest.fn();
    const scheduleDraw = jest.spyOn(
      pixiApp as unknown as { scheduleDraw: (reason?: string) => void },
      'scheduleDraw',
    ).mockImplementation(() => undefined);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      contextRestoring: false,
      app: { renderer: {}, render },
      plot: { x: 0, y: 0, scale: { set: jest.fn() }, rotation: 0 },
      hoverLayer: { clear: jest.fn() },
      axisLabelOverlay: { sync: jest.fn() },
      needsPatternTextureRefresh: false,
      isInteractive: false,
      dirtyRegistry: {
        markAllMidDraw: jest.fn(),
        resetAllMidDraw: jest.fn(),
        invalidateAll: jest.fn(),
      },
      graphEngine: {
        prepareWorld: jest.fn(() => {
          throw new Error('prepare failed');
        }),
        getLastDrawErrors: jest.fn(() => []),
        hasPatternSprites: jest.fn(() => false),
        clearPatternSprites: jest.fn(),
      },
    });

    try {
      await expect(
        (pixiApp as unknown as { executeDrawBody: () => Promise<void> }).executeDrawBody(),
      ).rejects.toThrow('prepare failed');

      expect(scheduleDraw).not.toHaveBeenCalled();
      expect(rafCallbacks).toHaveLength(1);
      rafCallbacks[0]?.(0);
      expect(scheduleDraw).toHaveBeenCalledTimes(1);
      expect(scheduleDraw).toHaveBeenCalledWith('autoRetry');
      expect(
        (pixiApp as unknown as { drawFailureAutoRetryArmed: boolean }).drawFailureAutoRetryArmed,
      ).toBe(true);

      // Second failure must not arm another rAF auto-retry.
      await expect(
        (pixiApp as unknown as { executeDrawBody: () => Promise<void> }).executeDrawBody(),
      ).rejects.toThrow('prepare failed');
      expect(rafCallbacks).toHaveLength(1);
      expect(scheduleDraw).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
      scheduleDraw.mockRestore();
    }
  });

  it('executeDrawBody throws when prepareWorld returns false without painting', async () => {
    const pixiApp = new PixiApp();
    const render = jest.fn();

    patchPixiApp(pixiApp, {
      isInitialized: true,
      contextRestoring: false,
      app: { renderer: {}, render },
      plot: { x: 0, y: 0, scale: { set: jest.fn() }, rotation: 0 },
      hoverLayer: { clear: jest.fn() },
      axisLabelOverlay: { sync: jest.fn() },
      needsPatternTextureRefresh: false,
      isInteractive: false,
      dirtyRegistry: {
        markAllMidDraw: jest.fn(),
        resetAllMidDraw: jest.fn(),
        invalidateAll: jest.fn(),
      },
      graphEngine: {
        prepareWorld: jest.fn(() => false),
        getLastDrawErrors: jest.fn(() => []),
        hasPatternSprites: jest.fn(() => false),
        clearPatternSprites: jest.fn(),
      },
    });

    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as typeof requestAnimationFrame;

    try {
      await expect(
        (pixiApp as unknown as { executeDrawBody: () => Promise<void> }).executeDrawBody(),
      ).rejects.toThrow('prepareWorld incomplete: missing axis bounds');
      expect(render).not.toHaveBeenCalled();
      expect(
        (pixiApp as unknown as { scenePaintState: string }).scenePaintState,
      ).toBe('failed');
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });

  it('executeDrawBody success resets auto-retry and paints via paint()', async () => {
    const pixiApp = new PixiApp();
    const render = jest.fn();
    const paint = jest.fn();

    patchPixiApp(pixiApp, {
      isInitialized: true,
      contextRestoring: false,
      drawFailureAutoRetryArmed: true,
      app: { renderer: {}, render },
      plot: { x: 0, y: 0, scale: { set: jest.fn() }, rotation: 0 },
      hoverLayer: { clear: jest.fn() },
      axisLabelOverlay: { sync: jest.fn() },
      needsPatternTextureRefresh: false,
      isInteractive: false,
      dirtyRegistry: {
        markAllMidDraw: jest.fn(),
        resetAllMidDraw: jest.fn(),
        invalidateAll: jest.fn(),
      },
      graphEngine: {
        prepareWorld: jest.fn(() => true),
        getLastDrawErrors: jest.fn(() => []),
        hasPatternSprites: jest.fn(() => false),
        clearPatternSprites: jest.fn(),
      },
      updateWorldTransforms: jest.fn(),
      syncAxisLabelOverlay: jest.fn(),
      paint,
    });

    await (
      pixiApp as unknown as { executeDrawBody: () => Promise<void> }
    ).executeDrawBody();

    expect(paint).toHaveBeenCalledWith('draw-complete');
    expect(render).not.toHaveBeenCalled();
    expect(
      (pixiApp as unknown as { drawFailureAutoRetryArmed: boolean }).drawFailureAutoRetryArmed,
    ).toBe(false);
  });

  it('requestRender paints via paint() when scene is stable', () => {
    const pixiApp = new PixiApp();
    const paint = jest.fn();
    const render = jest.fn();

    patchPixiApp(pixiApp, {
      isInitialized: true,
      scenePaintState: 'stable',
      drawInProgress: false,
      exportInProgress: false,
      drawFrameScheduled: false,
      app: { renderer: {}, render },
      dirtyRegistry: {
        isAnyUnsafeToPaint: () => false,
      },
      paint,
    });

    pixiApp.requestRender();

    expect(paint).toHaveBeenCalledWith('partial');
    expect(render).not.toHaveBeenCalled();
  });

  it('retryDraw schedules a full draw via scheduleDraw', () => {
    const pixiApp = new PixiApp();
    const scheduleDraw = jest.spyOn(
      pixiApp as unknown as { scheduleDraw: (reason?: string) => void },
      'scheduleDraw',
    );

    pixiApp.retryDraw();

    expect(scheduleDraw).toHaveBeenCalledWith('retry');
    scheduleDraw.mockRestore();
  });

  it('redrawCategory schedules a full draw via scheduleDraw', () => {
    const pixiApp = new PixiApp();
    const scheduleDraw = jest.spyOn(
      pixiApp as unknown as { scheduleDraw: (reason?: string) => void },
      'scheduleDraw',
    );
    const redrawCategory = jest.fn();
    patchPixiApp(pixiApp, {
      graphEngine: { redrawCategory },
    });

    pixiApp.redrawCategory('cat-1');

    expect(scheduleDraw).toHaveBeenCalledWith('redrawCategory');
    expect(redrawCategory).not.toHaveBeenCalled();
    scheduleDraw.mockRestore();
  });

  it('redrawObservable schedules a full draw via scheduleDraw', () => {
    const pixiApp = new PixiApp();
    const scheduleDraw = jest.spyOn(
      pixiApp as unknown as { scheduleDraw: (reason?: string) => void },
      'scheduleDraw',
    );
    const redrawObservable = jest.fn();
    patchPixiApp(pixiApp, {
      graphEngine: { redrawObservable },
    });

    pixiApp.redrawObservable('obs-1');

    expect(scheduleDraw).toHaveBeenCalledWith('redrawObservable');
    expect(redrawObservable).not.toHaveBeenCalled();
    scheduleDraw.mockRestore();
  });

  it('requestRender does not flush app.render while drawInProgress', () => {
    const pixiApp = new PixiApp();
    const render = jest.fn();
    const scheduleDraw = jest.spyOn(
      pixiApp as unknown as { scheduleDraw: (reason?: string) => void },
      'scheduleDraw',
    ).mockImplementation(() => undefined);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      app: { renderer: {}, render },
      drawInProgress: true,
      exportInProgress: false,
    });

    pixiApp.requestRender();

    expect(render).not.toHaveBeenCalled();
    expect(scheduleDraw).not.toHaveBeenCalled();
    scheduleDraw.mockRestore();
  });

  it('requestRender schedules draw instead of partial flush when midDraw', () => {
    const pixiApp = new PixiApp();
    const render = jest.fn();
    const scheduleDraw = jest.spyOn(
      pixiApp as unknown as { scheduleDraw: (reason?: string) => void },
      'scheduleDraw',
    ).mockImplementation(() => undefined);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      app: { renderer: {}, render },
      drawInProgress: false,
      exportInProgress: false,
      scenePaintState: 'stable',
      dirtyRegistry: {
        isAnyUnsafeToPaint: () => true,
      },
    });

    pixiApp.requestRender();

    expect(render).not.toHaveBeenCalled();
    expect(scheduleDraw).toHaveBeenCalledWith('renderGate');
    scheduleDraw.mockRestore();
  });

  it('requestRender does not schedule draw while scenePaintState is failed', () => {
    const pixiApp = new PixiApp();
    const render = jest.fn();
    const scheduleDraw = jest.spyOn(
      pixiApp as unknown as { scheduleDraw: (reason?: string) => void },
      'scheduleDraw',
    ).mockImplementation(() => undefined);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      app: { renderer: {}, render },
      drawInProgress: false,
      exportInProgress: false,
      scenePaintState: 'failed',
      dirtyRegistry: {
        isAnyUnsafeToPaint: () => true,
      },
    });

    pixiApp.requestRender();
    pixiApp.requestRender();

    expect(render).not.toHaveBeenCalled();
    expect(scheduleDraw).not.toHaveBeenCalled();
    scheduleDraw.mockRestore();
  });

  it('retryDraw rearms auto-retry then schedules draw', () => {
    const pixiApp = new PixiApp();
    const scheduleDraw = jest.spyOn(
      pixiApp as unknown as { scheduleDraw: (reason?: string) => void },
      'scheduleDraw',
    ).mockImplementation(() => undefined);

    patchPixiApp(pixiApp, {
      drawFailureAutoRetryArmed: true,
      drawFailureAutoRetryRafId: 42,
    });

    pixiApp.retryDraw();

    expect(
      (pixiApp as unknown as { drawFailureAutoRetryArmed: boolean }).drawFailureAutoRetryArmed,
    ).toBe(false);
    expect(scheduleDraw).toHaveBeenCalledWith('retry');
    scheduleDraw.mockRestore();
  });

  it('setViewportTransform with skipLabelRefresh does not call syncPositions', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }) as typeof requestAnimationFrame;

    const pixiApp = new PixiApp();
    const syncPositions = jest.fn();
    const requestRender = jest.fn();

    patchPixiApp(pixiApp, {
      viewport: { scale: { set: jest.fn() }, x: 0, y: 0, getGlobalTransform: jest.fn() },
      zoomState: { scale: 1, x: 0, y: 0 },
      axisStretch: { x: 1, y: 1 },
      worldBounds: { width: 800, height: 600 },
      axisLabelOverlay: { syncPositions, sync: jest.fn(), clear: jest.fn() },
      hoverLayer: { clear: jest.fn() },
      app: { canvas: { style: {} }, renderer: {} },
      getCanvasSize: () => ({ width: 800, height: 600 }),
      updateWorldTransforms: jest.fn(),
      requestRender,
      events: { emit: jest.fn() },
      updateTimeScale: jest.fn(),
    });

    try {
      (
        pixiApp as unknown as {
          setViewportTransform: (
            transform: { scale?: number },
            options?: { skipLabelRefresh?: boolean },
          ) => void;
        }
      ).setViewportTransform({ scale: 2 }, { skipLabelRefresh: true });

      expect(syncPositions).not.toHaveBeenCalled();
      expect(requestRender).not.toHaveBeenCalled();

      rafCallbacks[0]?.(0);

      expect(syncPositions).not.toHaveBeenCalled();
      expect(requestRender).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });

  it('setViewportTransform schedules label refresh and render via rAF without re-collecting', () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }) as typeof requestAnimationFrame;

    const pixiApp = new PixiApp();
    const syncPositions = jest.fn();
    const requestRender = jest.fn();
    const collectAxisLabelDescriptors = jest.fn(() => []);

    patchPixiApp(pixiApp, {
      viewport: { scale: { set: jest.fn() }, x: 0, y: 0, getGlobalTransform: jest.fn() },
      zoomState: { scale: 1, x: 0, y: 0 },
      axisStretch: { x: 1, y: 1 },
      worldBounds: { width: 800, height: 600 },
      axisLabelOverlay: { syncPositions, sync: jest.fn(), clear: jest.fn() },
      hoverLayer: { clear: jest.fn() },
      app: { canvas: { style: {} }, renderer: {} },
      getCanvasSize: () => ({ width: 800, height: 600 }),
      updateWorldTransforms: jest.fn(),
      requestRender,
      collectAxisLabelDescriptors,
      events: { emit: jest.fn() },
      updateTimeScale: jest.fn(),
    });

    try {
      (
        pixiApp as unknown as {
          setViewportTransform: (transform: { x?: number }) => void;
        }
      ).setViewportTransform({ x: 50 });

      expect(syncPositions).not.toHaveBeenCalled();
      expect(requestRender).not.toHaveBeenCalled();
      expect(collectAxisLabelDescriptors).not.toHaveBeenCalled();

      rafCallbacks[0]?.(0);

      expect(syncPositions).toHaveBeenCalledTimes(1);
      expect(requestRender).toHaveBeenCalledTimes(1);
      expect(collectAxisLabelDescriptors).not.toHaveBeenCalled();
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });

  it('setAxisStretch with unchanged values does not call draw', async () => {
    const pixiApp = new PixiApp();
    const draw = jest.fn().mockResolvedValue(undefined);

    patchPixiApp(pixiApp, {
      axisStretch: { x: 1, y: 1, minStretch: 0.25, maxStretch: 4 },
      yAxis: { setAxisStretch: jest.fn() },
      xAxis: { setAxisStretch: jest.fn() },
      dataArea: { setAxisStretch: jest.fn() },
      isInteractive: true,
      draw,
    });

    await pixiApp.setAxisStretch({ x: 1, y: 1 });

    expect(draw).not.toHaveBeenCalled();
  });

  it('setAxisStretch changed with { redraw: false } updates stretch without draw', async () => {
    const pixiApp = new PixiApp();
    const draw = jest.fn().mockResolvedValue(undefined);
    const yAxisSetAxisStretch = jest.fn();
    const xAxisSetAxisStretch = jest.fn();
    const dataAreaSetAxisStretch = jest.fn();

    patchPixiApp(pixiApp, {
      axisStretch: { x: 1, y: 1, minStretch: 0.25, maxStretch: 4 },
      yAxis: { setAxisStretch: yAxisSetAxisStretch },
      xAxis: { setAxisStretch: xAxisSetAxisStretch },
      dataArea: { setAxisStretch: dataAreaSetAxisStretch },
      isInteractive: true,
      draw,
    });

    await pixiApp.setAxisStretch({ x: 2, y: 1 }, { redraw: false });

    expect(yAxisSetAxisStretch).toHaveBeenCalledWith({ x: 2, y: 1 });
    expect(xAxisSetAxisStretch).toHaveBeenCalledWith({ x: 2, y: 1 });
    expect(dataAreaSetAxisStretch).toHaveBeenCalledWith({ x: 2, y: 1 });
    expect(draw).not.toHaveBeenCalled();
  });
});
