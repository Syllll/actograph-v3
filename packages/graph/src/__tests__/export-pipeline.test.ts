import { Application } from 'pixi.js';
import { ExportPipeline } from '../engine/ExportPipeline';

describe('ExportPipeline', () => {
  it('restores viewport, canvas size and hover after SVG serialization fails', async () => {
    const stage = {} as Application['stage'];
    const app = { canvas: {}, stage, screen: { width: 800, height: 400 }, renderer: {} } as unknown as Application;
    const savedViewport = { scale: 2, x: 20, y: 30 };
    const setViewportTransform = jest.fn();
    const setHoverSuppressed = jest.fn();
    const resizeRenderer = jest.fn((width: number, height: number) => {
      Object.assign(app.screen, { width, height });
    });
    const pipeline = new ExportPipeline({
      app, isInteractive: () => true, getRequiredCanvasHeight: () => 900,
      enqueueDrawBody: jest.fn().mockResolvedValue(undefined), setViewportTransform,
      setHoverSuppressed, resizeRenderer, updateWorldBounds: jest.fn(),
      recalculateFitViewport: jest.fn(), getWorldBounds: () => ({ width: 800, height: 900 }),
      getZoomState: () => ({ scale: 2, minScale: 0.1, maxScale: 5 }),
      getViewportTransform: () => savedViewport, presentCommittedScene: jest.fn(),
    });
    const capture = jest.fn(() => { throw new Error('Unsupported SVG object'); });
    await expect(pipeline.capturePreparedScene(capture)).rejects.toThrow('Unsupported SVG object');
    expect(capture).toHaveBeenCalledWith(stage, 800, 900);
    expect(resizeRenderer.mock.calls).toEqual([[800, 900], [800, 400]]);
    expect(setViewportTransform).toHaveBeenLastCalledWith(savedViewport, { emitZoom: false, skipRender: true });
    expect(setHoverSuppressed).toHaveBeenLastCalledWith(false);
    expect(app.screen.height).toBe(400);
    await expect(pipeline.capturePreparedScene(() => '<svg/>')).resolves.toBe('<svg/>');
    expect(app.screen.height).toBe(400);
  });

  it.each(['draw', 'extract', 'restore'] as const)(
    'cancels safely when the graph is destroyed during %s',
    async (phase) => {
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      let entered: () => void = () => undefined;
      const started = new Promise<void>((resolve) => { entered = resolve; });
      const extract = jest.fn(async () => {
        if (phase === 'extract') { entered(); await gate; }
        return 'data:image/png;base64,abc';
      });
      const app = {
        canvas: {}, screen: { width: 800, height: 400 }, stage: {},
        renderer: { extract: { base64: extract } },
      } as unknown as Application;
      const setViewportTransform = jest.fn();
      const setHoverSuppressed = jest.fn();
      const resizeRenderer = jest.fn();
      let drawCount = 0;
      const enqueueDrawBody = jest.fn(async () => {
        drawCount += 1;
        if (phase === 'draw' || (phase === 'restore' && drawCount === 2)) {
          entered();
          await gate;
        }
      });
      const pipeline = new ExportPipeline({
        app, isInteractive: () => true, getRequiredCanvasHeight: () => 900,
        enqueueDrawBody, setViewportTransform, setHoverSuppressed, resizeRenderer,
        updateWorldBounds: jest.fn(), recalculateFitViewport: jest.fn(),
        getWorldBounds: () => ({ width: 800, height: 900 }),
        getZoomState: () => ({ scale: 1, minScale: 0.1, maxScale: 5 }),
        getViewportTransform: () => ({ scale: 1, x: 0, y: 0 }),
        presentCommittedScene: jest.fn(),
      });
      const result = pipeline.exportAsImage('png');
      await started;
      Object.assign(app, { renderer: null, stage: null });
      release();

      await expect(result).resolves.toBeNull();
      expect(resizeRenderer).toHaveBeenCalledTimes(phase === 'restore' ? 2 : 1);
      expect(setViewportTransform).toHaveBeenCalledTimes(phase === 'restore' ? 2 : 1);
      expect(setHoverSuppressed).toHaveBeenCalledTimes(1);
      expect(enqueueDrawBody).toHaveBeenCalledTimes(phase === 'restore' ? 2 : 1);
      expect(extract).toHaveBeenCalledTimes(phase === 'draw' ? 0 : 1);
    },
  );

  it('captures via renderer.extract.base64, not app.canvas.toDataURL', async () => {
    const extractBase64 = jest.fn().mockResolvedValue('data:image/png;base64,abc');
    const canvasToDataURL = jest.fn();

    const app = {
      canvas: {
        toDataURL: canvasToDataURL,
      },
      screen: { width: 800, height: 600 },
      stage: { id: 'stage' },
      renderer: {
        resize: jest.fn(),
        extract: {
          base64: extractBase64,
        },
      },
      render: jest.fn(),
    } as unknown as Application;

    const pipeline = new ExportPipeline({
      app,
      isInteractive: () => false,
      getRequiredCanvasHeight: () => 600,
      enqueueDrawBody: jest.fn().mockResolvedValue(undefined),
      setViewportTransform: jest.fn(),
      updateWorldBounds: jest.fn(),
      recalculateFitViewport: jest.fn(),
      getWorldBounds: () => ({ width: 800, height: 600 }),
      getZoomState: () => ({ scale: 1, minScale: 0.1, maxScale: 5 }),
      getViewportTransform: () => ({ scale: 1, x: 0, y: 0 }),
      setHoverSuppressed: jest.fn(),
      resizeRenderer: jest.fn(),
      presentCommittedScene: jest.fn(),
    });

    const result = await pipeline.exportAsImage('png');

    expect(result).toBe('data:image/png;base64,abc');
    expect(extractBase64).toHaveBeenCalledWith({
      target: app.stage,
      format: 'png',
      quality: 0.92,
      clearColor: '#ffffff',
    });
    expect(canvasToDataURL).not.toHaveBeenCalled();
    expect(app.render).not.toHaveBeenCalled();
  });

  it('presents after each interactive export resize before the async draw', async () => {
    const extractBase64 = jest.fn().mockResolvedValue('data:image/png;base64,abc');
    const app = {
      canvas: {},
      screen: { width: 800, height: 400 },
      stage: { id: 'stage' },
      renderer: {
        resize: jest.fn(),
        extract: { base64: extractBase64 },
      },
    } as unknown as Application;

    const callOrder: string[] = [];
    const resizeRenderer = jest.fn(() => {
      callOrder.push('resize');
    });
    const presentCommittedScene = jest.fn(() => {
      callOrder.push('present');
    });
    const enqueueDrawBody = jest.fn(async () => {
      callOrder.push('draw');
    });
    const setViewportTransform = jest.fn(() => {
      callOrder.push('viewport');
    });

    const pipeline = new ExportPipeline({
      app,
      isInteractive: () => true,
      getRequiredCanvasHeight: () => 900,
      enqueueDrawBody,
      setViewportTransform,
      updateWorldBounds: jest.fn(),
      recalculateFitViewport: jest.fn(),
      getWorldBounds: () => ({ width: 800, height: 900 }),
      getZoomState: () => ({ scale: 1, minScale: 0.1, maxScale: 5 }),
      getViewportTransform: () => ({ scale: 1, x: 0, y: 0 }),
      setHoverSuppressed: jest.fn(),
      resizeRenderer,
      presentCommittedScene,
    });

    await pipeline.exportAsImage('png');

    expect(app.renderer.resize).not.toHaveBeenCalled();
    expect(resizeRenderer).toHaveBeenCalledWith(800, 900);
    expect(resizeRenderer).toHaveBeenCalledWith(800, 400);
    expect(callOrder).toEqual([
      'resize',
      'viewport',
      'present',
      'draw',
      'resize',
      'viewport',
      'present',
      'draw',
    ]);
  });
});

it.each(['webgl', 'webgpu'] as const)('keeps transparent PNG semantic colors with %s readback', async (rendererKind) => {
  const rawPixels = new Uint8ClampedArray(rendererKind === 'webgl' ? [0, 0, 51, 51] : [0, 0, 255, 51]);
  const image = { data: new Uint8ClampedArray(4) };
  const context = { createImageData: () => image, putImageData: jest.fn() };
  const canvas = { getContext: () => context, toDataURL: () => JSON.stringify([...image.data]) };
  const originalDocument = globalThis.document;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } });
  try {
    const renderer = { ...(rendererKind === 'webgl' ? { gl: {} } : {}),
      extract: { pixels: jest.fn(() => ({ pixels: rawPixels, width: 1, height: 1 })) } };
    const app = { canvas: {}, stage: {}, screen: { width: 1, height: 1 }, renderer } as unknown as Application;
    const pipeline = new ExportPipeline({
      app, isInteractive: () => false, getRequiredCanvasHeight: () => 1,
      enqueueDrawBody: jest.fn().mockResolvedValue(undefined), setViewportTransform: jest.fn(),
      setHoverSuppressed: jest.fn(), resizeRenderer: jest.fn(), updateWorldBounds: jest.fn(),
      recalculateFitViewport: jest.fn(), getWorldBounds: () => ({ width: 1, height: 1 }),
      getZoomState: () => ({ scale: 1, minScale: 0.1, maxScale: 5 }),
      getViewportTransform: () => ({ scale: 1, x: 0, y: 0 }), presentCommittedScene: jest.fn(),
    });
    await expect(pipeline.exportAsImage('png', 0.92, { transparentBackground: true }))
      .resolves.toBe('[0,0,255,51]');
  } finally {
    if (originalDocument === undefined) delete (globalThis as { document?: Document }).document;
    else Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
  }
});
