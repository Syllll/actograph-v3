import {
  buildCategoryPieChartData,
  buildCategoryPieChartColors,
  calculateUnaccountedPieDuration,
  shouldIncludePauseSegment,
} from '../category-pie-chart.utils';

const baseStats = {
  totalCategoryDuration: 9 * 60 * 1000,
  pauseDuration: 1 * 60 * 1000,
  observables: [
    {
      observableName: 'obsA',
      onDuration: 3 * 60 * 1000,
      onPercentage: (3 / 9) * 100,
      onCount: 1,
    },
    {
      observableName: 'obsB',
      onDuration: 6 * 60 * 1000,
      onPercentage: (6 / 9) * 100,
      onCount: 1,
    },
  ],
};

describe('shouldIncludePauseSegment', () => {
  it('returns true when treatPausesAsSeparateState is on and pause duration > 0', () => {
    expect(shouldIncludePauseSegment(true, 60_000)).toBe(true);
  });

  it('returns false when treatPausesAsSeparateState is off', () => {
    expect(shouldIncludePauseSegment(false, 60_000)).toBe(false);
  });

  it('returns false when pause duration is zero', () => {
    expect(shouldIncludePauseSegment(true, 0)).toBe(false);
  });
});

const formatDuration = (ms: number) => `${ms}ms`;

describe('buildCategoryPieChartData', () => {
  it('adds a pause segment when treatPausesAsSeparateState is on', () => {
    const data = buildCategoryPieChartData(baseStats, {
      treatPausesAsSeparateState: true,
      pauseSegmentLabel: 'Pause',
      unaccountedSegmentLabel: 'Unaccounted',
      formatDuration,
    });

    expect(data).toHaveLength(3);
    expect(data[2]).toEqual({
      label: 'Pause',
      value: 10,
      durationLabel: '60000ms',
    });
  });

  it('sums to 100% in separate-state mode with pauses', () => {
    const data = buildCategoryPieChartData(baseStats, {
      treatPausesAsSeparateState: true,
      pauseSegmentLabel: 'Pause',
      unaccountedSegmentLabel: 'Unaccounted',
      formatDuration,
    });

    const total = data.reduce((sum, segment) => sum + segment.value, 0);
    expect(total).toBeCloseTo(100, 5);

    expect(data[0].value).toBeCloseTo(30, 5);
    expect(data[1].value).toBeCloseTo(60, 5);
    expect(data[2].value).toBeCloseTo(10, 5);
  });

  it('does not add a pause segment when treatPausesAsSeparateState is off', () => {
    const statsWithPausesIncluded = {
      totalCategoryDuration: 10 * 60 * 1000,
      pauseDuration: 1 * 60 * 1000,
      observables: [
        {
          observableName: 'obsA',
          onDuration: 4 * 60 * 1000,
          onPercentage: 40,
          onCount: 1,
        },
        {
          observableName: 'obsB',
          onDuration: 6 * 60 * 1000,
          onPercentage: 60,
          onCount: 1,
        },
      ],
    };

    const data = buildCategoryPieChartData(statsWithPausesIncluded, {
      treatPausesAsSeparateState: false,
      pauseSegmentLabel: 'Pause',
      unaccountedSegmentLabel: 'Unaccounted',
      formatDuration,
    });

    expect(data).toHaveLength(2);
    expect(data.some((segment) => segment.label === 'Pause')).toBe(false);

    const total = data.reduce((sum, segment) => sum + segment.value, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it('adds an unaccounted segment when the first observable starts after the observation START', () => {
    // Observation window is 10 min, but the first observable of the category only
    // appears 1 min in: that lead time isn't covered by any observable or pause.
    const statsWithLateFirstObservable = {
      observationDuration: 9 * 60 * 1000, // 10 min window minus 1 min pause
      pauseDuration: 1 * 60 * 1000,
      observables: [
        {
          observableName: 'obsA',
          onDuration: 3 * 60 * 1000,
          onPercentage: (3 / 9) * 100,
          onCount: 1,
        },
        {
          observableName: 'obsB',
          onDuration: 5 * 60 * 1000,
          onPercentage: (5 / 9) * 100,
          onCount: 1,
        },
      ],
    };

    const data = buildCategoryPieChartData(statsWithLateFirstObservable, {
      treatPausesAsSeparateState: true,
      pauseSegmentLabel: 'Pause',
      unaccountedSegmentLabel: 'Unaccounted',
      formatDuration,
    });

    expect(data).toHaveLength(4);
    expect(data[3]).toEqual({
      label: 'Unaccounted',
      // 1 min gap out of the full 10 min window (9 min + 1 min pause)
      value: 10,
      durationLabel: '60000ms',
    });

    const total = data.reduce((sum, segment) => sum + segment.value, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it('does not add an unaccounted segment when observables fully cover the window', () => {
    const data = buildCategoryPieChartData(baseStats, {
      treatPausesAsSeparateState: true,
      pauseSegmentLabel: 'Pause',
      unaccountedSegmentLabel: 'Unaccounted',
      formatDuration,
    });

    expect(data.some((segment) => segment.label === 'Unaccounted')).toBe(false);
  });

  it('uses the full filtered window as denominator when pause toggle is off (conditional ex-pause base)', () => {
    const conditionalStats = {
      observationDuration: 1 * 60 * 1000,
      windowDuration: 2 * 60 * 1000,
      pauseDuration: 1 * 60 * 1000,
      observables: [
        {
          observableName: 'obsA',
          onDuration: 1 * 60 * 1000,
          onPercentage: 50,
          onCount: 1,
        },
      ],
    };

    const data = buildCategoryPieChartData(conditionalStats, {
      treatPausesAsSeparateState: false,
      pauseSegmentLabel: 'Pause',
      unaccountedSegmentLabel: 'Unaccounted',
      formatDuration,
    });

    expect(data[0].value).toBeCloseTo(50, 5);
    const total = data.reduce((sum, segment) => sum + segment.value, 0);
    expect(total).toBeCloseTo(100, 5);
  });
});

describe('calculateUnaccountedPieDuration', () => {
  it('returns the gap between the observation window and the accounted durations', () => {
    const stats = {
      observationDuration: 9 * 60 * 1000,
      pauseDuration: 1 * 60 * 1000,
      observables: [
        { observableName: 'obsA', onDuration: 3 * 60 * 1000, onPercentage: 0, onCount: 1 },
        { observableName: 'obsB', onDuration: 5 * 60 * 1000, onPercentage: 0, onCount: 1 },
      ],
    };

    expect(calculateUnaccountedPieDuration(stats, true)).toBe(1 * 60 * 1000);
  });

  it('returns 0 when there is no gap', () => {
    expect(calculateUnaccountedPieDuration(baseStats, true)).toBe(0);
  });
});

describe('buildCategoryPieChartColors', () => {
  it('appends the pause color only when the pause segment is shown', () => {
    expect(buildCategoryPieChartColors(true, 60_000)).toHaveLength(9);
    expect(buildCategoryPieChartColors(false, 60_000)).toHaveLength(8);
  });

  it('appends the unaccounted color only when requested', () => {
    expect(buildCategoryPieChartColors(true, 60_000, undefined, true)).toHaveLength(10);
    expect(buildCategoryPieChartColors(true, 60_000, undefined, false)).toHaveLength(9);
    expect(buildCategoryPieChartColors(false, 0, undefined, true)).toHaveLength(9);
  });
});
