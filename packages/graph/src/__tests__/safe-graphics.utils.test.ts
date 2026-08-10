import {
  isFiniteNumber,
  isFinitePoint,
  safeMoveTo,
  safeLineTo,
  safeRect,
  safeEllipse,
  safeStrokeLine,
  SafeStrokeBatch,
} from '../utils/safe-graphics.utils';

describe('safe-graphics.utils', () => {
  function createMockGraphics() {
    return {
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      ellipse: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      setStrokeStyle: jest.fn().mockReturnThis(),
      setFillStyle: jest.fn().mockReturnThis(),
    };
  }

  describe('isFiniteNumber / isFinitePoint', () => {
    it('rejects NaN and Infinity', () => {
      expect(isFiniteNumber(NaN)).toBe(false);
      expect(isFiniteNumber(Infinity)).toBe(false);
      expect(isFinitePoint(1, NaN)).toBe(false);
      expect(isFinitePoint(Infinity, 2)).toBe(false);
    });

    it('accepts finite numbers', () => {
      expect(isFiniteNumber(0)).toBe(true);
      expect(isFinitePoint(10, -3.5)).toBe(true);
    });
  });

  describe('safeMoveTo / safeLineTo', () => {
    it('no-ops on non-finite coordinates', () => {
      const g = createMockGraphics();
      expect(safeMoveTo(g, NaN, 0)).toBe(false);
      expect(safeLineTo(g, 0, Infinity)).toBe(false);
      expect(g.moveTo).not.toHaveBeenCalled();
      expect(g.lineTo).not.toHaveBeenCalled();
    });

    it('draws on finite coordinates', () => {
      const g = createMockGraphics();
      expect(safeMoveTo(g, 1, 2)).toBe(true);
      expect(safeLineTo(g, 3, 4)).toBe(true);
      expect(g.moveTo).toHaveBeenCalledWith(1, 2);
      expect(g.lineTo).toHaveBeenCalledWith(3, 4);
    });
  });

  describe('safeRect', () => {
    it('no-ops on non-finite or non-positive size', () => {
      const g = createMockGraphics();
      expect(safeRect(g, NaN, 0, 10, 10)).toBe(false);
      expect(safeRect(g, 0, 0, 0, 10)).toBe(false);
      expect(safeRect(g, 0, 0, -5, 10)).toBe(false);
      expect(g.rect).not.toHaveBeenCalled();
    });

    it('fills when fill option is provided', () => {
      const g = createMockGraphics();
      const fillStyle = { color: 'red', alpha: 0.2 };
      expect(safeRect(g, 5, 10, 20, 30, { fill: fillStyle })).toBe(true);
      expect(g.rect).toHaveBeenCalledWith(5, 10, 20, 30);
      expect(g.fill).toHaveBeenCalledWith(fillStyle);
    });

    it('strokes when stroke option is provided', () => {
      const g = createMockGraphics();
      const strokeStyle = { color: 'blue', width: 1 };
      expect(safeRect(g, 0, 0, 50, 40, { stroke: strokeStyle })).toBe(true);
      expect(g.stroke).toHaveBeenCalledWith(strokeStyle);
    });
  });

  describe('safeEllipse', () => {
    it('no-ops on non-finite center or non-positive radii', () => {
      const g = createMockGraphics();
      expect(safeEllipse(g, NaN, 0, 5, 5)).toBe(false);
      expect(safeEllipse(g, 0, 0, 0, 5)).toBe(false);
      expect(safeEllipse(g, 0, 0, -2, 5)).toBe(false);
      expect(g.ellipse).not.toHaveBeenCalled();
    });

    it('draws a valid ellipse with optional fill', () => {
      const g = createMockGraphics();
      const fillStyle = { color: 'red' };
      expect(safeEllipse(g, 10, 20, 4, 6, { fill: fillStyle })).toBe(true);
      expect(g.ellipse).toHaveBeenCalledWith(10, 20, 4, 6);
      expect(g.fill).toHaveBeenCalledWith(fillStyle);
    });
  });

  describe('safeStrokeLine', () => {
    it('no-ops on non-finite endpoints', () => {
      const g = createMockGraphics();
      expect(safeStrokeLine(g, 0, 0, NaN, 10)).toBe(false);
      expect(g.moveTo).not.toHaveBeenCalled();
    });

    it('no-ops on zero-length segments', () => {
      const g = createMockGraphics();
      expect(safeStrokeLine(g, 5, 5, 5, 5)).toBe(false);
      expect(g.moveTo).not.toHaveBeenCalled();
    });

    it('strokes a valid segment', () => {
      const g = createMockGraphics();
      const style = { color: 'black', width: 2 };
      expect(safeStrokeLine(g, 0, 0, 10, 20, style)).toBe(true);
      expect(g.setStrokeStyle).toHaveBeenCalledWith(style);
      expect(g.moveTo).toHaveBeenCalledWith(0, 0);
      expect(g.lineTo).toHaveBeenCalledWith(10, 20);
      expect(g.stroke).toHaveBeenCalled();
    });
  });

  describe('SafeStrokeBatch', () => {
    it('batches N segments with the same style into one stroke()', () => {
      const g = createMockGraphics();
      const batch = new SafeStrokeBatch(g);
      const style = { color: 'red', width: 2 };

      batch.addLine(0, 0, 10, 0, style);
      batch.addLine(10, 0, 10, 20, style);
      batch.addLine(10, 20, 0, 20, style);
      batch.flush();

      expect(g.setStrokeStyle).toHaveBeenCalledTimes(1);
      expect(g.stroke).toHaveBeenCalledTimes(1);
      expect(g.moveTo).toHaveBeenCalledTimes(3);
      expect(g.lineTo).toHaveBeenCalledTimes(3);
    });

    it('flushes on style change producing two strokes', () => {
      const g = createMockGraphics();
      const batch = new SafeStrokeBatch(g);

      batch.addLine(0, 0, 10, 0, { color: 'red', width: 2 });
      batch.addLine(20, 0, 30, 0, { color: 'blue', width: 2 });
      batch.flush();

      expect(g.setStrokeStyle).toHaveBeenCalledTimes(2);
      expect(g.stroke).toHaveBeenCalledTimes(2);
    });

    it('no-ops on NaN coordinates', () => {
      const g = createMockGraphics();
      const batch = new SafeStrokeBatch(g);

      batch.addLine(0, 0, NaN, 10, { color: 'red', width: 1 });
      batch.flush();

      expect(g.moveTo).not.toHaveBeenCalled();
      expect(g.stroke).not.toHaveBeenCalled();
    });
  });
});
