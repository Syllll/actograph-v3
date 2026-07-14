import type { IPeriod } from '@actograph/core';
import {
  computePauseOverlayRects,
  resolveMaskPausesOption,
  shouldDrawPauseOverlay,
} from '../utils/pause-overlay.utils';

const bounds = {
  leftX: 100,
  rightX: 500,
  topY: 20,
  bottomY: 200,
};

function linearXScale(originMs: number, pxPerMs: number) {
  return (date: Date) => 100 + (date.getTime() - originMs) * pxPerMs;
}

describe('pause-overlay.utils', () => {
  it('returns rectangles for each pause interval within data bounds', () => {
    const origin = new Date('2024-01-01T10:00:00Z').getTime();
    const getX = linearXScale(origin, 0.0003);
    const periods: IPeriod[] = [
      {
        start: new Date('2024-01-01T10:10:00Z'),
        end: new Date('2024-01-01T10:20:00Z'),
      },
      {
        start: new Date('2024-01-01T10:02:00Z'),
        end: new Date('2024-01-01T10:04:00Z'),
      },
    ];

    const rects = computePauseOverlayRects(periods, bounds, getX, { maskPauses: false });

    expect(rects).toHaveLength(2);
    expect(rects[0]).toEqual({
      x: getX(periods[0]!.start),
      y: bounds.topY,
      width: getX(periods[0]!.end) - getX(periods[0]!.start),
      height: bounds.bottomY - bounds.topY,
    });
    expect(rects[1]?.width).toBeGreaterThan(0);
  });

  it('returns no rectangles when maskPauses is enabled (pauses hidden)', () => {
    const getX = linearXScale(new Date('2024-01-01T10:00:00Z').getTime(), 0.01);
    const periods: IPeriod[] = [
      {
        start: new Date('2024-01-01T10:10:00Z'),
        end: new Date('2024-01-01T10:20:00Z'),
      },
    ];

    expect(computePauseOverlayRects(periods, bounds, getX, { maskPauses: true })).toEqual([]);
    expect(shouldDrawPauseOverlay(true)).toBe(false);
    expect(resolveMaskPausesOption({ maskPauses: true })).toBe(false);
  });

  it('defaults maskPauses to disabled (visible) when option is omitted', () => {
    expect(shouldDrawPauseOverlay(undefined)).toBe(true);
    expect(resolveMaskPausesOption({})).toBe(true);
  });

  it('clips rectangles to the data area horizontal bounds', () => {
    const origin = new Date('2024-01-01T10:00:00Z').getTime();
    const getX = linearXScale(origin, 0.01);
    const periods: IPeriod[] = [
      {
        start: new Date('2024-01-01T09:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      },
    ];

    const rects = computePauseOverlayRects(periods, bounds, getX, { maskPauses: false });

    expect(rects).toHaveLength(1);
    expect(rects[0]?.x).toBe(bounds.leftX);
    expect(rects[0]?.x + rects[0]!.width).toBe(bounds.rightX);
  });

  it('recalculates x positions when the time scale changes (viewport zoom)', () => {
    const origin = new Date('2024-01-01T10:00:00Z').getTime();
    const period: IPeriod = {
      start: new Date('2024-01-01T10:10:00Z'),
      end: new Date('2024-01-01T10:20:00Z'),
    };

    const zoomedOut = computePauseOverlayRects([period], bounds, linearXScale(origin, 0.0002), {
      maskPauses: false,
    });
    const zoomedIn = computePauseOverlayRects([period], bounds, linearXScale(origin, 0.0004), {
      maskPauses: false,
    });

    expect(zoomedOut).toHaveLength(1);
    expect(zoomedIn).toHaveLength(1);
    expect(zoomedIn[0]!.width).toBeGreaterThan(zoomedOut[0]!.width);
    expect(zoomedIn[0]!.x).not.toBe(zoomedOut[0]!.x);
  });

  it('skips zero-width intervals after clipping', () => {
    const getX = () => bounds.leftX;
    const periods: IPeriod[] = [
      {
        start: new Date('2024-01-01T10:10:00Z'),
        end: new Date('2024-01-01T10:20:00Z'),
      },
    ];

    expect(computePauseOverlayRects(periods, bounds, getX, { maskPauses: false })).toEqual([]);
  });
});
