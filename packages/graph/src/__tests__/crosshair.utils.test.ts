import { computeCrosshairSegments } from '../utils/crosshair.utils';

describe('crosshair.utils', () => {
  const bounds = {
    leftX: 150,
    rightX: 720,
    topY: 20,
    bottomY: 580,
  };

  describe('computeCrosshairSegments', () => {
    it('draws a vertical line spanning the full plot height', () => {
      const { vertical } = computeCrosshairSegments(400, 300, bounds);

      expect(vertical.x1).toBe(400);
      expect(vertical.x2).toBe(400);
      expect(vertical.y1).toBe(bounds.topY);
      expect(vertical.y2).toBe(bounds.bottomY);
    });

    it('draws a horizontal line spanning the full plot width', () => {
      const { horizontal } = computeCrosshairSegments(400, 300, bounds);

      expect(horizontal.y1).toBe(300);
      expect(horizontal.y2).toBe(300);
      expect(horizontal.x1).toBe(bounds.leftX);
      expect(horizontal.x2).toBe(bounds.rightX);
    });

    it('anchors crosshair endpoints on both axes at the plot corners', () => {
      const { vertical, horizontal } = computeCrosshairSegments(400, 300, bounds);

      expect(vertical.y1).toBe(bounds.topY);
      expect(vertical.y2).toBe(bounds.bottomY);
      expect(horizontal.x1).toBe(bounds.leftX);
      expect(horizontal.x2).toBe(bounds.rightX);
    });

    it('keeps both axes aligned when the cursor is near a plot edge', () => {
      const { vertical, horizontal } = computeCrosshairSegments(bounds.leftX, bounds.topY, bounds);

      expect(vertical.x1).toBe(bounds.leftX);
      expect(horizontal.y1).toBe(bounds.topY);
      expect(vertical.y2).toBe(bounds.bottomY);
      expect(horizontal.x2).toBe(bounds.rightX);
    });
  });
});
