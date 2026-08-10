import {
  computePlotBoundsInOverlay,
  worldGlobalToOverlayLocal,
} from '../utils/hover-bounds.utils';

describe('hover-bounds.utils', () => {
  describe('worldGlobalToOverlayLocal', () => {
    it('delegates to overlay.toLocal', () => {
      const overlay = {
        toLocal: (p: { x: number; y: number }) => ({ x: p.x * 2, y: p.y * 3 }),
      };
      expect(worldGlobalToOverlayLocal({ x: 10, y: 20 }, overlay)).toEqual({
        x: 20,
        y: 60,
      });
    });
  });

  describe('computePlotBoundsInOverlay', () => {
    const yAxisStart = { x: 0, y: 100 };
    const yAxisEnd = { x: 0, y: 0 };
    const xAxisEnd = { x: 200, y: 100 };

    it('maps axis corners through global→overlay converters', () => {
      const bounds = computePlotBoundsInOverlay({
        yAxisStart,
        yAxisEnd,
        xAxisEnd,
        yAxisToGlobal: (p) => ({ x: p.x + 10, y: p.y + 20 }),
        xAxisToGlobal: (p) => ({ x: p.x + 30, y: p.y + 40 }),
        overlayToLocal: (p) => ({ x: p.x * 2, y: p.y * 2 }),
      });

      expect(bounds).toEqual({
        leftX: 20,
        rightX: 460,
        topY: 40,
        bottomY: 240,
      });
    });

    it('returns null when xAxisEnd lacks numeric coordinates', () => {
      expect(
        computePlotBoundsInOverlay({
          yAxisStart,
          yAxisEnd,
          xAxisEnd: { x: undefined as unknown as number, y: 100 },
          yAxisToGlobal: (p) => p,
          xAxisToGlobal: (p) => p,
          overlayToLocal: (p) => p,
        }),
      ).toBeNull();
    });

    it('simulates viewport zoom via overlayToLocal scale', () => {
      const zoom = 2;
      const bounds = computePlotBoundsInOverlay({
        yAxisStart,
        yAxisEnd,
        xAxisEnd,
        yAxisToGlobal: (p) => ({ x: p.x * zoom, y: p.y * zoom }),
        xAxisToGlobal: (p) => ({ x: p.x * zoom, y: p.y * zoom }),
        overlayToLocal: (p) => p,
      });

      expect(bounds).toEqual({
        leftX: 0,
        rightX: 400,
        topY: 0,
        bottomY: 200,
      });
    });
  });
});
