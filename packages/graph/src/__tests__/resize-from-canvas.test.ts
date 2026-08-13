jest.mock('pixi.js', () => {
  class MockDisplayObject {
    eventMode = 'auto';
    children: unknown[] = [];
    addChild(child: unknown) {
      this.children.push(child);
      return child;
    }
    destroy() {}
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

import { PixiApp } from '../pixi-app';

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

describe('PixiApp resizeFromCanvas', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('interactive skipRender presents immediately and skips label refresh', () => {
    const pixiApp = new PixiApp();
    const mock = createMutableScreenMock(400, 300);
    const setViewportTransform = jest.fn();
    const syncPositions = jest.fn();

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: true,
      exportInProgress: false,
      wasDegenerateCanvas: false,
      drawInProgress: false,
      scenePaintState: 'stable',
      layoutFitPending: false,
      app: mock.app,
      viewport: { scale: { set: jest.fn() }, x: 0, y: 0 },
      zoomState: { scale: 1, x: 0, y: 0 },
      axisStretch: { x: 1, y: 1 },
      worldBounds: { width: 800, height: 600 },
      updateWorldBounds: jest.fn(),
      recalculateFitViewport: jest.fn(),
      setViewportTransform,
      axisLabelOverlay: { syncPositions, sync: jest.fn(), setViewportSize: jest.fn() },
      getCanvasSize: () => ({ width: mock.screen.width, height: mock.screen.height }),
      dirtyRegistry: { isAnyUnsafeToPaint: () => false },
    });

    mock.rect.width = 800;
    mock.rect.height = 600;

    const didResize = pixiApp.resizeFromCanvas({ skipRender: true });

    expect(didResize).toBe(true);
    expect(mock.resize).toHaveBeenCalledWith(800, 600);
    expect(setViewportTransform).toHaveBeenCalledWith(
      { scale: 1, x: expect.any(Number), y: expect.any(Number) },
      { emitZoom: false, skipRender: true, skipLabelRefresh: true },
    );
    expect(syncPositions).toHaveBeenCalled();
    expect(mock.app.render).toHaveBeenCalledTimes(1);
    expect(syncPositions.mock.invocationCallOrder[0]).toBeLessThan(
      (mock.app.render as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(
      (pixiApp as unknown as { needsLabelTextureRefresh: boolean }).needsLabelTextureRefresh,
    ).toBe(true);
  });

  it('presents after resize even when midDraw lock is set (last committed scene is still valid)', () => {
    const pixiApp = new PixiApp();
    const mock = createMutableScreenMock(400, 300);
    const setViewportTransform = jest.fn();

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: true,
      exportInProgress: false,
      wasDegenerateCanvas: false,
      drawInProgress: false,
      scenePaintState: 'stable',
      layoutFitPending: false,
      app: mock.app,
      viewport: { scale: { set: jest.fn() }, x: 0, y: 0 },
      zoomState: { scale: 1, x: 0, y: 0 },
      axisStretch: { x: 1, y: 1 },
      worldBounds: { width: 800, height: 600 },
      updateWorldBounds: jest.fn(),
      recalculateFitViewport: jest.fn(),
      setViewportTransform,
      axisLabelOverlay: { syncPositions: jest.fn(), sync: jest.fn(), setViewportSize: jest.fn() },
      getCanvasSize: () => ({ width: mock.screen.width, height: mock.screen.height }),
      dirtyRegistry: { isAnyUnsafeToPaint: () => true },
    });

    mock.rect.width = 800;
    mock.rect.height = 600;

    expect(pixiApp.resizeFromCanvas({ skipRender: true })).toBe(true);
    expect(mock.app.render).toHaveBeenCalledTimes(1);
  });

  it('defers renderer.resize while a full draw is mutating', () => {
    const pixiApp = new PixiApp();
    const mock = createMutableScreenMock(400, 300);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: true,
      exportInProgress: false,
      drawInProgress: true,
      scenePaintState: 'mutating',
      app: mock.app,
    });

    mock.rect.width = 800;
    mock.rect.height = 600;

    const didResize = pixiApp.resizeFromCanvas({ skipRender: true });

    expect(didResize).toBe(false);
    expect(mock.resize).not.toHaveBeenCalled();
    expect(
      (pixiApp as unknown as { pendingCanvasResize: boolean }).pendingCanvasResize,
    ).toBe(true);
    expect(pixiApp.hasPendingCanvasResize()).toBe(true);
  });

  it('defers renderer.resize during export and arms pendingCanvasResize', () => {
    const pixiApp = new PixiApp();
    const mock = createMutableScreenMock(400, 300);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: true,
      exportInProgress: true,
      drawInProgress: false,
      scenePaintState: 'stable',
      app: mock.app,
    });

    mock.rect.width = 800;
    mock.rect.height = 600;

    const didResize = pixiApp.resizeFromCanvas({ skipRender: true });

    expect(didResize).toBe(false);
    expect(mock.resize).not.toHaveBeenCalled();
    expect(
      (pixiApp as unknown as { pendingCanvasResize: boolean }).pendingCanvasResize,
    ).toBe(true);
  });

  it('defers renderer.resize while the scene is failed', () => {
    const pixiApp = new PixiApp();
    const mock = createMutableScreenMock(400, 300);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: true,
      exportInProgress: false,
      drawInProgress: false,
      scenePaintState: 'failed',
      app: mock.app,
    });

    mock.rect.width = 800;
    mock.rect.height = 600;

    const didResize = pixiApp.resizeFromCanvas({ skipRender: true });

    expect(didResize).toBe(false);
    expect(mock.resize).not.toHaveBeenCalled();
    expect(
      (pixiApp as unknown as { pendingCanvasResize: boolean }).pendingCanvasResize,
    ).toBe(true);
  });

  it('executeDrawBody applies a pending resize before prepareWorld', async () => {
    const pixiApp = new PixiApp();
    const applyCanvasResizeFromDom = jest.fn().mockReturnValue(true);
    const prepareWorld = jest.fn().mockReturnValue(true);
    const callOrder: string[] = [];

    applyCanvasResizeFromDom.mockImplementation(() => {
      callOrder.push('resize');
      return true;
    });
    prepareWorld.mockImplementation(() => {
      callOrder.push('prepareWorld');
      return true;
    });

    patchPixiApp(pixiApp, {
      isInitialized: true,
      contextRestoring: false,
      pendingCanvasResize: true,
      scenePaintState: 'stable',
      applyCanvasResizeFromDom,
      app: { renderer: {}, render: jest.fn() },
      plot: { x: 0, y: 0, scale: { set: jest.fn() }, rotation: 0 },
      hoverLayer: { clear: jest.fn() },
      axisLabelOverlay: { sync: jest.fn(), setViewportSize: jest.fn() },
      needsPatternTextureRefresh: false,
      isInteractive: false,
      dirtyRegistry: {
        markAllMidDraw: jest.fn(),
        resetAllMidDraw: jest.fn(),
        invalidateAll: jest.fn(),
        isAnyUnsafeToPaint: () => false,
      },
      graphEngine: {
        prepareWorld,
        getLastDrawErrors: jest.fn(() => []),
        hasPatternSprites: jest.fn(() => false),
        clearPatternSprites: jest.fn(),
      },
      updateWorldTransforms: jest.fn(),
      syncAxisLabelOverlay: jest.fn(),
    });

    await (
      pixiApp as unknown as { executeDrawBody: () => Promise<void> }
    ).executeDrawBody();

    expect(applyCanvasResizeFromDom).toHaveBeenCalledWith({
      present: true,
      skipRender: true,
    });
    expect(callOrder[0]).toBe('resize');
    expect(callOrder[1]).toBe('prepareWorld');
    expect(
      (pixiApp as unknown as { pendingCanvasResize: boolean }).pendingCanvasResize,
    ).toBe(false);
  });

  it('syncAxisLabelOverlay recreates texts after a resize', () => {
    const pixiApp = new PixiApp();
    const sync = jest.fn();

    patchPixiApp(pixiApp, {
      needsLabelTextureRefresh: true,
      axisLabelOverlay: { sync, setViewportSize: jest.fn() },
      collectAxisLabelDescriptors: () => [{ id: 'y-1' }],
      app: { screen: { width: 400, height: 300 } },
    });

    (
      pixiApp as unknown as { syncAxisLabelOverlay: () => void }
    ).syncAxisLabelOverlay();

    expect(sync).toHaveBeenCalledWith([{ id: 'y-1' }], { recreate: true });
    expect(
      (pixiApp as unknown as { needsLabelTextureRefresh: boolean }).needsLabelTextureRefresh,
    ).toBe(false);
  });

  it('executeDrawBody flushes a pending resize without present when the scene is failed', async () => {
    const pixiApp = new PixiApp();
    const applyCanvasResizeFromDom = jest.fn().mockReturnValue(true);
    const prepareWorld = jest.fn().mockReturnValue(true);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      contextRestoring: false,
      pendingCanvasResize: true,
      scenePaintState: 'failed',
      applyCanvasResizeFromDom,
      app: { renderer: {}, render: jest.fn() },
      plot: { x: 0, y: 0, scale: { set: jest.fn() }, rotation: 0 },
      hoverLayer: { clear: jest.fn() },
      axisLabelOverlay: { sync: jest.fn(), setViewportSize: jest.fn() },
      needsPatternTextureRefresh: false,
      isInteractive: false,
      dirtyRegistry: {
        markAllMidDraw: jest.fn(),
        resetAllMidDraw: jest.fn(),
        invalidateAll: jest.fn(),
        isAnyUnsafeToPaint: () => false,
      },
      graphEngine: {
        prepareWorld,
        getLastDrawErrors: jest.fn(() => []),
        hasPatternSprites: jest.fn(() => false),
        clearPatternSprites: jest.fn(),
      },
      updateWorldTransforms: jest.fn(),
      syncAxisLabelOverlay: jest.fn(),
    });

    await (
      pixiApp as unknown as { executeDrawBody: () => Promise<void> }
    ).executeDrawBody();

    expect(applyCanvasResizeFromDom).toHaveBeenCalledWith({
      present: false,
      skipRender: true,
    });
  });

  it('consumePendingCanvasResizeAfterIdle does not resize a failed scene', () => {
    const pixiApp = new PixiApp();
    const applyCanvasResizeFromDom = jest.fn();
    const scheduleDraw = jest.fn();

    patchPixiApp(pixiApp, {
      exportInProgress: false,
      pendingCanvasResize: true,
      scenePaintState: 'failed',
      drawInProgress: false,
      applyCanvasResizeFromDom,
      scheduleDraw,
    });

    (
      pixiApp as unknown as { consumePendingCanvasResizeAfterIdle: () => void }
    ).consumePendingCanvasResizeAfterIdle();

    expect(applyCanvasResizeFromDom).not.toHaveBeenCalled();
    expect(scheduleDraw).toHaveBeenCalledWith('pending-resize');
    expect(
      (pixiApp as unknown as { pendingCanvasResize: boolean }).pendingCanvasResize,
    ).toBe(true);
  });
});
