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
});
