import {
  isPointInsidePlotBounds,
  shouldRenderHoverOverlay,
} from '../utils/hover-overlay.utils';

describe('hover-overlay.utils', () => {
  describe('shouldRenderHoverOverlay', () => {
    it('renders hover UI when the graph is interactive and not suppressed', () => {
      expect(
        shouldRenderHoverOverlay({ interactive: true, suppressed: false }),
      ).toBe(true);
    });

    it('hides hover UI during image export', () => {
      expect(
        shouldRenderHoverOverlay({ interactive: true, suppressed: true }),
      ).toBe(false);
    });

    it('never renders hover UI when the graph is not interactive', () => {
      expect(
        shouldRenderHoverOverlay({ interactive: false, suppressed: false }),
      ).toBe(false);
      expect(
        shouldRenderHoverOverlay({ interactive: false, suppressed: true }),
      ).toBe(false);
    });
  });

  describe('isPointInsidePlotBounds', () => {
    const bounds = {
      leftX: 150,
      rightX: 720,
      topY: 20,
      bottomY: 580,
    };

    it('returns true for a point inside the plot', () => {
      expect(isPointInsidePlotBounds(400, 300, bounds)).toBe(true);
    });

    it('returns true on plot edges', () => {
      expect(isPointInsidePlotBounds(bounds.leftX, bounds.topY, bounds)).toBe(true);
      expect(isPointInsidePlotBounds(bounds.rightX, bounds.bottomY, bounds)).toBe(true);
    });

    it('returns false outside the plot', () => {
      expect(isPointInsidePlotBounds(bounds.leftX - 1, 300, bounds)).toBe(false);
      expect(isPointInsidePlotBounds(400, bounds.topY - 1, bounds)).toBe(false);
    });
  });

  describe('export contract', () => {
    it('blocks hover redraw while export suppression is active', () => {
      const exportState = { interactive: true, suppressed: true };
      const afterExportState = { interactive: true, suppressed: false };

      expect(shouldRenderHoverOverlay(exportState)).toBe(false);
      expect(shouldRenderHoverOverlay(afterExportState)).toBe(true);
    });
  });
});
