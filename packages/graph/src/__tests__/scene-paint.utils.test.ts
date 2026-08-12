import {
  canPaintPartial,
  isAuthoritativePaintReason,
  shouldScheduleDrawOnPaintGate,
} from '../utils/scene-paint.utils';

describe('scene-paint.utils', () => {
  describe('isAuthoritativePaintReason', () => {
    it('returns true for init, draw-complete, export', () => {
      expect(isAuthoritativePaintReason('init')).toBe(true);
      expect(isAuthoritativePaintReason('draw-complete')).toBe(true);
      expect(isAuthoritativePaintReason('export')).toBe(true);
    });

    it('returns false for partial reasons', () => {
      expect(isAuthoritativePaintReason('hover')).toBe(false);
      expect(isAuthoritativePaintReason('partial')).toBe(false);
      expect(isAuthoritativePaintReason('leave')).toBe(false);
    });
  });

  describe('canPaintPartial', () => {
    const stableIdle = {
      scenePaintState: 'stable' as const,
      drawInProgress: false,
      exportInProgress: false,
      drawQueued: false,
    };

    it('allows partial paint on stable idle scene', () => {
      expect(canPaintPartial(stableIdle)).toBe(true);
    });

    it('refuses when scene is mutating or failed', () => {
      expect(canPaintPartial({ ...stableIdle, scenePaintState: 'mutating' })).toBe(false);
      expect(canPaintPartial({ ...stableIdle, scenePaintState: 'failed' })).toBe(false);
    });

    it('refuses during draw, export, or queued draw', () => {
      expect(canPaintPartial({ ...stableIdle, drawInProgress: true })).toBe(false);
      expect(canPaintPartial({ ...stableIdle, exportInProgress: true })).toBe(false);
      expect(canPaintPartial({ ...stableIdle, drawQueued: true })).toBe(false);
    });
  });

  describe('shouldScheduleDrawOnPaintGate', () => {
    it('schedules draw for hover/pan-like reasons', () => {
      expect(shouldScheduleDrawOnPaintGate('hover')).toBe(true);
      expect(shouldScheduleDrawOnPaintGate('pan')).toBe(true);
      expect(shouldScheduleDrawOnPaintGate('partial')).toBe(true);
    });

    it('does not schedule for leave or authoritative reasons', () => {
      expect(shouldScheduleDrawOnPaintGate('leave')).toBe(false);
      expect(shouldScheduleDrawOnPaintGate('init')).toBe(false);
      expect(shouldScheduleDrawOnPaintGate('draw-complete')).toBe(false);
      expect(shouldScheduleDrawOnPaintGate('export')).toBe(false);
    });
  });
});
