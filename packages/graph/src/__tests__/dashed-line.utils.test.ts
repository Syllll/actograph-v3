import { computeDashedLineOps } from '../utils/dashed-line.utils';

describe('dashed-line.utils', () => {
  describe('computeDashedLineOps', () => {
    it('returns no ops for a zero-length segment', () => {
      expect(computeDashedLineOps(10, 20, 10, 20)).toEqual([]);
    });

    it('ends with a line op at the exact endpoint', () => {
      const ops = computeDashedLineOps(0, 0, 22, 0, [10, 5]);
      const lastOp = ops[ops.length - 1];

      expect(lastOp).toEqual({ type: 'line', x: 22, y: 0 });
    });

    it('reaches the endpoint even when the dash pattern ends on a gap', () => {
      const ops = computeDashedLineOps(0, 0, 17, 0, [10, 5]);
      const lineOps = ops.filter((op) => op.type === 'line');
      const lastLine = lineOps[lineOps.length - 1];

      expect(lastLine).toEqual({ type: 'line', x: 17, y: 0 });
    });

    it('draws along the full segment length for vertical lines', () => {
      const ops = computeDashedLineOps(50, 10, 50, 37, [10, 5]);
      const lastOp = ops[ops.length - 1];

      expect(lastOp).toEqual({ type: 'line', x: 50, y: 37 });
    });

    it('starts drawing from the segment origin', () => {
      const ops = computeDashedLineOps(150, 20, 150, 580, [10, 5]);

      expect(ops[0]).toEqual({ type: 'move', x: 150, y: 20 });
      expect(ops[1]?.type).toBe('line');
    });

    it('emits nothing for non-finite endpoints', () => {
      expect(computeDashedLineOps(0, 0, NaN, 0)).toEqual([]);
      expect(computeDashedLineOps(0, 0, 10, Infinity)).toEqual([]);
      expect(computeDashedLineOps(NaN, NaN, 10, 10)).toEqual([]);
    });

    it('never emits a non-finite vertex', () => {
      const ops = computeDashedLineOps(0, 0, 1e7, 0, [10, 5]);

      expect(ops.every((op) => Number.isFinite(op.x) && Number.isFinite(op.y))).toBe(true);
    });

    it('falls back to a solid line instead of unbounded dash geometry', () => {
      const ops = computeDashedLineOps(0, 0, 1e7, 0, [10, 5]);

      expect(ops).toEqual([
        { type: 'move', x: 0, y: 0 },
        { type: 'line', x: 1e7, y: 0 },
      ]);
    });

    it('keeps dashing spans that stay under the geometry cap', () => {
      const ops = computeDashedLineOps(0, 0, 600, 0, [10, 5]);

      expect(ops.length).toBeGreaterThan(4);
    });
  });
});
