import {
  canPaintPartial,
  isAuthoritativePaintReason,
  nextPendingPartialPaint,
  shouldScheduleDrawOnPaintGate,
  type PaintReason,
  type ScenePaintState,
} from '../utils/scene-paint.utils';

describe('scene-paint.utils', () => {
  describe('isAuthoritativePaintReason', () => {
    it('allows draw-complete, export and init', () => {
      expect(isAuthoritativePaintReason('draw-complete')).toBe(true);
      expect(isAuthoritativePaintReason('export')).toBe(true);
      expect(isAuthoritativePaintReason('init')).toBe(true);
    });

    it('rejects partial reasons', () => {
      const partial: PaintReason[] = ['hover', 'leave', 'pan', 'zoom', 'resize', 'partial'];
      for (const reason of partial) {
        expect(isAuthoritativePaintReason(reason)).toBe(false);
      }
    });
  });

  describe('canPaintPartial', () => {
    const stableIdle = {
      scenePaintState: 'stable' as ScenePaintState,
      drawInProgress: false,
      exportInProgress: false,
      drawQueued: false,
    };

    it('allows paint only when stable and idle', () => {
      expect(canPaintPartial(stableIdle)).toBe(true);
    });

    it('blocks while mutating or failed', () => {
      expect(canPaintPartial({ ...stableIdle, scenePaintState: 'mutating' })).toBe(false);
      expect(canPaintPartial({ ...stableIdle, scenePaintState: 'failed' })).toBe(false);
    });

    it('blocks while draw, export, or queued draw is in progress', () => {
      expect(canPaintPartial({ ...stableIdle, drawInProgress: true })).toBe(false);
      expect(canPaintPartial({ ...stableIdle, exportInProgress: true })).toBe(false);
      expect(canPaintPartial({ ...stableIdle, drawQueued: true })).toBe(false);
    });
  });

  describe('shouldScheduleDrawOnPaintGate', () => {
    it('schedules for hover/pan but not for leave', () => {
      expect(shouldScheduleDrawOnPaintGate('hover')).toBe(true);
      expect(shouldScheduleDrawOnPaintGate('pan')).toBe(true);
      expect(shouldScheduleDrawOnPaintGate('leave')).toBe(false);
      expect(shouldScheduleDrawOnPaintGate('draw-complete')).toBe(false);
    });
  });

  describe('nextPendingPartialPaint', () => {
    it('coalesces many refusals into a single pending bit', () => {
      let pending = false;
      pending = nextPendingPartialPaint({ pending, event: 'refused' });
      pending = nextPendingPartialPaint({ pending, event: 'refused' });
      pending = nextPendingPartialPaint({ pending, event: 'refused' });
      pending = nextPendingPartialPaint({ pending, event: 'refused' });
      expect(pending).toBe(true);
    });

    it('clears on successful paint or draw-complete consumption', () => {
      expect(nextPendingPartialPaint({ pending: true, event: 'painted' })).toBe(false);
      expect(
        nextPendingPartialPaint({ pending: true, event: 'draw-complete-consumed' }),
      ).toBe(false);
    });
  });
});
