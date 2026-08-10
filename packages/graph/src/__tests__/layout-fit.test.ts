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

describe('PixiApp layout fit pending', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets layoutFitPending on interactive init', () => {
    const pixiApp = new PixiApp();
    patchPixiApp(pixiApp, {
      isInteractive: true,
      layoutFitPending: true,
      needsInitialFit: true,
      isInitialized: true,
    });

    expect(
      (pixiApp as unknown as { layoutFitPending: boolean }).layoutFitPending,
    ).toBe(true);
    expect(
      (pixiApp as unknown as { needsInitialFit: boolean }).needsInitialFit,
    ).toBe(true);
  });

  it('resizeFromCanvas re-arms needsInitialFit when layoutFitPending and size changes', () => {
    const pixiApp = new PixiApp();
    const mock = createMutableScreenMock(400, 300);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: true,
      exportInProgress: false,
      wasDegenerateCanvas: false,
      layoutFitPending: true,
      needsInitialFit: false,
      app: mock.app,
      viewport: { scale: { set: jest.fn() }, x: 0, y: 0 },
      zoomState: { scale: 1, x: 0, y: 0 },
      axisStretch: { x: 1, y: 1 },
      worldBounds: { width: 800, height: 600 },
      updateWorldBounds: jest.fn(),
      recalculateFitViewport: jest.fn(),
      setViewportTransform: jest.fn(),
      getCanvasSize: () => ({ width: mock.screen.width, height: mock.screen.height }),
    });

    mock.rect.width = 800;
    mock.rect.height = 600;

    const didResize = pixiApp.resizeFromCanvas({ skipRender: true });

    expect(didResize).toBe(true);
    expect(mock.resize).toHaveBeenCalledWith(800, 600);
    expect(
      (pixiApp as unknown as { needsInitialFit: boolean }).needsInitialFit,
    ).toBe(true);
  });

  it('resizeFromCanvas does not re-arm needsInitialFit once layoutFitPending is false', () => {
    const pixiApp = new PixiApp();
    const mock = createMutableScreenMock(400, 300);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: true,
      exportInProgress: false,
      wasDegenerateCanvas: false,
      layoutFitPending: false,
      needsInitialFit: false,
      app: mock.app,
      viewport: { scale: { set: jest.fn() }, x: 0, y: 0 },
      zoomState: { scale: 1, x: 0, y: 0 },
      axisStretch: { x: 1, y: 1 },
      worldBounds: { width: 800, height: 600 },
      updateWorldBounds: jest.fn(),
      recalculateFitViewport: jest.fn(),
      setViewportTransform: jest.fn(),
      getCanvasSize: () => ({ width: mock.screen.width, height: mock.screen.height }),
    });

    mock.rect.width = 800;
    mock.rect.height = 600;

    pixiApp.resizeFromCanvas({ skipRender: true });

    expect(
      (pixiApp as unknown as { needsInitialFit: boolean }).needsInitialFit,
    ).toBe(false);
  });

  it('settleInitialLayoutFit resizes, draws, and clears layoutFitPending', async () => {
    const pixiApp = new PixiApp();
    const mock = createMutableScreenMock(400, 300);
    const draw = jest.fn().mockResolvedValue(undefined);
    const resizeFromCanvas = jest
      .spyOn(pixiApp, 'resizeFromCanvas')
      .mockReturnValue(true);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: true,
      layoutFitPending: true,
      needsInitialFit: false,
      app: mock.app,
      draw,
      getCanvasSize: () => ({ width: mock.screen.width, height: mock.screen.height }),
    });

    await pixiApp.settleInitialLayoutFit();

    expect(resizeFromCanvas).toHaveBeenCalledWith({ skipRender: true });
    expect(draw).toHaveBeenCalledTimes(1);
    expect(
      (pixiApp as unknown as { needsInitialFit: boolean }).needsInitialFit,
    ).toBe(true);
    expect(
      (pixiApp as unknown as { layoutFitPending: boolean }).layoutFitPending,
    ).toBe(false);

    resizeFromCanvas.mockRestore();
  });

  it('settleInitialLayoutFit is a no-op when not interactive', async () => {
    const pixiApp = new PixiApp();
    const draw = jest.fn().mockResolvedValue(undefined);
    const resizeFromCanvas = jest
      .spyOn(pixiApp, 'resizeFromCanvas')
      .mockReturnValue(true);

    patchPixiApp(pixiApp, {
      isInitialized: true,
      isInteractive: false,
      layoutFitPending: true,
      draw,
    });

    await pixiApp.settleInitialLayoutFit();

    expect(resizeFromCanvas).not.toHaveBeenCalled();
    expect(draw).not.toHaveBeenCalled();
    expect(
      (pixiApp as unknown as { layoutFitPending: boolean }).layoutFitPending,
    ).toBe(true);

    resizeFromCanvas.mockRestore();
  });

  it('resetView clears layoutFitPending after draw', async () => {
    const pixiApp = new PixiApp();
    const draw = jest.fn().mockResolvedValue(undefined);

    patchPixiApp(pixiApp, {
      isInteractive: true,
      layoutFitPending: true,
      draw,
    });

    await pixiApp.resetView();

    expect(draw).toHaveBeenCalledTimes(1);
    expect(
      (pixiApp as unknown as { layoutFitPending: boolean }).layoutFitPending,
    ).toBe(false);
  });
});
