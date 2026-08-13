import { Application } from 'pixi.js';
import { ExportPipeline } from '../engine/ExportPipeline';

describe('ExportPipeline', () => {
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
