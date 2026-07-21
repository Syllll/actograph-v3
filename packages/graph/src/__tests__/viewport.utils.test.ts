import {
  clampViewport,
  computeFitScale,
  computeFitViewport,
  computeFitViewportPosition,
  isDegenerateCanvasSize,
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
        1,
      );
      expect(position).toEqual({ x: 200, y: 150 });
    });

    it('centers each axis independently when scaleX differs from scaleY', () => {
      const position = computeFitViewportPosition(
        { width: 400, height: 300 },
        { width: 800, height: 600 },
        1,
        2,
      );
      // scaledWidth = 400 -> centered x = 200 ; scaledHeight = 600 -> fills canvas, y = 0
      expect(position).toEqual({ x: 200, y: 0 });
    });
  });

  describe('clampViewport', () => {
    it('prevents panning into empty space vertically', () => {
      const clamped = clampViewport(
        { x: 0, y: 500, scaleX: 1, scaleY: 1 },
        { width: 800, height: 1200 },
        { width: 800, height: 600 },
      );
      expect(clamped.y).toBeLessThanOrEqual(24);
      expect(clamped.y).toBeGreaterThanOrEqual(600 - 1200 - 24);
    });

    it('centers plot when scaled smaller than canvas', () => {
      const clamped = clampViewport(
        { x: -200, y: -100, scaleX: 0.5, scaleY: 0.5 },
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
      const fitPos = computeFitViewportPosition(world, canvas, fitScale, fitScale);

      const scale = fitScale * 1.2 * 0.8;
      const clamped = clampViewport(
        { x: fitPos.x, y: fitPos.y, scaleX: scale, scaleY: scale },
        world,
        canvas,
      );

      expect(clamped.scaleY * world.height).toBeLessThanOrEqual(canvas.height);
      expect(clamped.y).toBeGreaterThanOrEqual(canvas.height - clamped.scaleY * world.height - 24);
      expect(clamped.y).toBeLessThanOrEqual(24);
    });

    it('clamps width and height independently when scaleX differs from scaleY', () => {
      const world = { width: 800, height: 1200 };
      const canvas = { width: 800, height: 600 };
      // scaleX fits width exactly (no horizontal overscroll possible), scaleY zooms in on height.
      const clamped = clampViewport(
        { x: -999, y: -999, scaleX: 1, scaleY: 2 },
        world,
        canvas,
      );

      // Width == canvas width at scaleX=1 -> horizontally centered, not clamped to -999.
      expect(clamped.x).toBe(0);
      // Height clamp still allows panning within bounds (not centered).
      expect(clamped.y).toBeGreaterThanOrEqual(canvas.height - world.height * 2 - 24);
      expect(clamped.y).toBeLessThanOrEqual(24);
    });
  });

  describe('computeFitViewport', () => {
    it('returns uniform scaleX/scaleY and centered position for export fit', () => {
      const fit = computeFitViewport(
        { width: 400, height: 1200 },
        { width: 800, height: 600 },
        minScale,
        maxScale,
      );
      expect(fit.scaleX).toBeCloseTo(0.5);
      expect(fit.scaleY).toBeCloseTo(0.5);
      expect(fit.x).toBe(300);
      expect(fit.y).toBe(0);
    });
  });

  describe('preserveViewportOnResize', () => {
    it('preserves user zoom scale after canvas resize', () => {
      const world = { width: 800, height: 1200 };
      const oldCanvas = { width: 800, height: 600 };
      const userViewport = { x: -50, y: -100, scaleX: 1.5, scaleY: 1.5 };
      void oldCanvas;

      const clamped = preserveViewportOnResize(
        userViewport,
        world,
        { width: 1024, height: 768 },
      );

      expect(clamped.scaleX).toBe(1.5);
      expect(clamped.scaleY).toBe(1.5);
      expect(clamped.x).toBeLessThanOrEqual(24);
      expect(clamped.y).toBeLessThanOrEqual(24);
    });
  });

  describe('export fit-for-export', () => {
    it('forces full-graph fit independent of user zoom', () => {
      const world = { width: 1600, height: 2400 };
      const exportCanvas = { width: 800, height: 600 };
      const userZoomed = { x: -400, y: -800, scaleX: 2.5, scaleY: 2.5 };

      const exportFit = computeFitViewport(world, exportCanvas, minScale, maxScale);
      const restored = preserveViewportOnResize(userZoomed, world, exportCanvas);

      expect(exportFit.scaleX).toBeLessThan(userZoomed.scaleX);
      expect(restored.scaleX).toBe(userZoomed.scaleX);
      expect(restored.x).not.toBe(exportFit.x);
    });
  });

  describe('isDegenerateCanvasSize', () => {
    it('returns true for near-zero dimensions', () => {
      expect(isDegenerateCanvasSize(0, 600)).toBe(true);
      expect(isDegenerateCanvasSize(800, 2)).toBe(true);
      expect(isDegenerateCanvasSize(1, 1)).toBe(true);
    });

    it('returns false for usable dimensions', () => {
      expect(isDegenerateCanvasSize(3, 600)).toBe(false);
      expect(isDegenerateCanvasSize(800, 400)).toBe(false);
    });
  });
});
