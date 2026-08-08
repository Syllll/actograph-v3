import { computeCrosshairSegments, computeHoverTimeLabelPosition } from '../utils/crosshair.utils';

describe('crosshair.utils', () => {
  const bounds = {
    leftX: 150,
    rightX: 720,
    topY: 20,
    bottomY: 580,
  };

  describe('computeCrosshairSegments', () => {
    it('draws a vertical stub from the cursor down to the bottom axis only', () => {
      const { vertical } = computeCrosshairSegments(400, 300, bounds);

      expect(vertical.x1).toBe(400);
      expect(vertical.x2).toBe(400);
      expect(vertical.y1).toBe(300);
      expect(vertical.y2).toBe(bounds.bottomY);
    });

    it('draws a horizontal stub from the cursor left to the left axis only', () => {
      const { horizontal } = computeCrosshairSegments(400, 300, bounds);

      expect(horizontal.y1).toBe(300);
      expect(horizontal.y2).toBe(300);
      expect(horizontal.x1).toBe(400);
      expect(horizontal.x2).toBe(bounds.leftX);
    });

    it('does not extend toward the top or right edges', () => {
      const { vertical, horizontal } = computeCrosshairSegments(400, 300, bounds);

      expect(vertical.y1).toBeGreaterThan(bounds.topY);
      expect(horizontal.x1).toBeLessThan(bounds.rightX);
      expect(Math.min(vertical.y1, vertical.y2)).toBe(300);
      expect(Math.max(horizontal.x1, horizontal.x2)).toBe(400);
    });

    it('collapses to zero-length stubs when the cursor sits on the left/bottom axes', () => {
      const { vertical, horizontal } = computeCrosshairSegments(
        bounds.leftX,
        bounds.bottomY,
        bounds,
      );

      expect(vertical.y1).toBe(bounds.bottomY);
      expect(vertical.y2).toBe(bounds.bottomY);
      expect(horizontal.x1).toBe(bounds.leftX);
      expect(horizontal.x2).toBe(bounds.leftX);
    });
  });

  describe('computeHoverTimeLabelPosition', () => {
    it('places the label above the cursor inside the plot', () => {
      const labelWidth = 120;
      const labelHeight = 24;
      const pos = computeHoverTimeLabelPosition(400, 300, labelWidth, labelHeight, bounds);

      expect(pos.x).toBe(400 - labelWidth / 2);
      expect(pos.y).toBe(300 - labelHeight - 8);
      expect(pos.y).toBeGreaterThanOrEqual(bounds.topY);
      expect(pos.y + labelHeight).toBeLessThanOrEqual(bounds.bottomY);
    });

    it('places the label below the cursor when there is no room above', () => {
      const labelWidth = 120;
      const labelHeight = 24;
      const pos = computeHoverTimeLabelPosition(400, bounds.topY + 4, labelWidth, labelHeight, bounds);

      expect(pos.y).toBe(bounds.topY + 4 + 8);
    });

    it('does not extend below the plot bottom (keeps X-axis labels uncovered)', () => {
      const labelWidth = 120;
      const labelHeight = 24;
      const pos = computeHoverTimeLabelPosition(400, bounds.bottomY - 2, labelWidth, labelHeight, bounds);

      expect(pos.y + labelHeight).toBeLessThanOrEqual(bounds.bottomY);
    });

    it('clamps horizontal position within plot bounds', () => {
      const labelWidth = 200;
      const labelHeight = 24;
      const pos = computeHoverTimeLabelPosition(bounds.leftX, 300, labelWidth, labelHeight, bounds);

      expect(pos.x).toBe(bounds.leftX);
    });
  });
});
