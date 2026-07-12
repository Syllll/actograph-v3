import {
  clampViewport,
  computeFitScale,
  computeFitViewport,
  computeFitViewportPosition,
  preserveViewportOnResize,
} from '../utils/viewport.utils';

describe('viewport.utils', () => {
  const minScale = 0.1;
  const maxScale = 5;

  describe('computeFitScale', () => {
    it('returns 1 when plot fits inside canvas', () => {
      const scale = computeFitScale(
        { width: 400, height: 300 },
        { width: 800, height: 600 },
        minScale,
        maxScale,
      );
      expect(scale).toBe(1);
    });

    it('shrinks plot when taller than canvas', () => {
      const scale = computeFitScale(
        { width: 400, height: 1200 },
        { width: 800, height: 600 },
        minScale,
        maxScale,
      );
      expect(scale).toBeCloseTo(0.5);
    });
  });

  describe('computeFitViewportPosition', () => {
    it('centers plot smaller than canvas', () => {
      const position = computeFitViewportPosition(
        { width: 400, height: 300 },
        { width: 800, height: 600 },
        1,
      );
      expect(position).toEqual({ x: 200, y: 150 });
    });
  });

  describe('clampViewport', () => {
    it('prevents panning into empty space vertically', () => {
      const clamped = clampViewport(
        { x: 0, y: 500, scale: 1 },
        { width: 800, height: 1200 },
        { width: 800, height: 600 },
      );
      expect(clamped.y).toBeLessThanOrEqual(24);
      expect(clamped.y).toBeGreaterThanOrEqual(600 - 1200 - 24);
    });

    it('centers plot when scaled smaller than canvas', () => {
      const clamped = clampViewport(
        { x: -200, y: -100, scale: 0.5 },
        { width: 400, height: 300 },
        { width: 800, height: 600 },
      );
      expect(clamped.x).toBe(300);
      expect(clamped.y).toBe(225);
    });

    it('keeps full plot visible after asymmetric zoom in/out on tall graph', () => {
      const world = { width: 800, height: 1200 };
      const canvas = { width: 800, height: 600 };
      const fitScale = computeFitScale(world, canvas, minScale, maxScale);
      const fitPos = computeFitViewportPosition(world, canvas, fitScale);

      let scale = fitScale * 1.2 * 0.8;
      const clamped = clampViewport({ x: fitPos.x, y: fitPos.y, scale }, world, canvas);

      expect(clamped.scale * world.height).toBeLessThanOrEqual(canvas.height);
      expect(clamped.y).toBeGreaterThanOrEqual(canvas.height - clamped.scale * world.height - 24);
      expect(clamped.y).toBeLessThanOrEqual(24);
    });
  });

  describe('computeFitViewport', () => {
    it('returns scale and centered position for export fit', () => {
      const fit = computeFitViewport(
        { width: 400, height: 1200 },
        { width: 800, height: 600 },
        minScale,
        maxScale,
      );
      expect(fit.scale).toBeCloseTo(0.5);
      expect(fit.x).toBe(300);
      expect(fit.y).toBe(0);
    });
  });

  describe('preserveViewportOnResize', () => {
    it('preserves user zoom scale after canvas resize', () => {
      const world = { width: 800, height: 1200 };
      const oldCanvas = { width: 800, height: 600 };
      const userViewport = { x: -50, y: -100, scale: 1.5 };

      const clamped = preserveViewportOnResize(
        userViewport,
        world,
        { width: 1024, height: 768 },
      );

      expect(clamped.scale).toBe(1.5);
      expect(clamped.x).toBeLessThanOrEqual(24);
      expect(clamped.y).toBeLessThanOrEqual(24);
    });
  });

  describe('export fit-for-export', () => {
    it('forces full-graph fit independent of user zoom', () => {
      const world = { width: 1600, height: 2400 };
      const exportCanvas = { width: 800, height: 600 };
      const userZoomed = { x: -400, y: -800, scale: 2.5 };

      const exportFit = computeFitViewport(world, exportCanvas, minScale, maxScale);
      const restored = preserveViewportOnResize(userZoomed, world, exportCanvas);

      expect(exportFit.scale).toBeLessThan(userZoomed.scale);
      expect(restored.scale).toBe(userZoomed.scale);
      expect(restored.x).not.toBe(exportFit.x);
    });
  });
});
