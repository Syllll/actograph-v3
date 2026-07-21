import {
  buildCategoryPieChartData,
  buildCategoryPieChartColors,
  calculateUnaccountedPieDuration,
  filterAndSortPieChartObservables,
  shouldIncludePauseSegment,
} from '../category-pie-chart.utils';
import { IObservableStatistics } from '@services/observations/statistics.interface';

function mockObservable(
  id: string,
  name: string,
  onDuration: number,
  onPercentage: number,
  onCount: number,
): IObservableStatistics {
  return {
    observableId: id,
    observableName: name,
    onDuration,
    onPercentage,
    onCount,
  };
}

const baseStats = {
  totalCategoryDuration: 9 * 60 * 1000,
  pauseDuration: 1 * 60 * 1000,
  observables: [
    mockObservable('obs-a', 'obsA', 3 * 60 * 1000, (3 / 9) * 100, 1),
    mockObservable('obs-b', 'obsB', 6 * 60 * 1000, (6 / 9) * 100, 1),
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

  it('sums to 100% in separate-state mode with pauses, sorted by descending duration', () => {
    const data = buildCategoryPieChartData(baseStats, {
      treatPausesAsSeparateState: true,
      pauseSegmentLabel: 'Pause',
      unaccountedSegmentLabel: 'Unaccounted',
      formatDuration,
    });

    const total = data.reduce((sum, segment) => sum + segment.value, 0);
    expect(total).toBeCloseTo(100, 5);

    // obs-b (6 min) has the longer duration, so it sorts before obs-a (3 min);
    // Pause always comes last among accounted segments.
    expect(data[0].label).toBe('obsB');
    expect(data[0].value).toBeCloseTo(60, 5);
    expect(data[1].label).toBe('obsA');
    expect(data[1].value).toBeCloseTo(30, 5);
    expect(data[2].value).toBeCloseTo(10, 5);
  });

  it('does not add a pause segment when treatPausesAsSeparateState is off', () => {
    const statsWithPausesIncluded = {
      totalCategoryDuration: 10 * 60 * 1000,
      pauseDuration: 1 * 60 * 1000,
      observables: [
        mockObservable('obs-a', 'obsA', 4 * 60 * 1000, 40, 1),
        mockObservable('obs-b', 'obsB', 6 * 60 * 1000, 60, 1),
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
        mockObservable('obs-a', 'obsA', 3 * 60 * 1000, (3 / 9) * 100, 1),
        mockObservable('obs-b', 'obsB', 5 * 60 * 1000, (5 / 9) * 100, 1),
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
        mockObservable('obs-a', 'obsA', 1 * 60 * 1000, 50, 1),
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
        mockObservable('obs-a', 'obsA', 3 * 60 * 1000, 0, 1),
        mockObservable('obs-b', 'obsB', 5 * 60 * 1000, 0, 1),
      ],
    };

    expect(calculateUnaccountedPieDuration(stats, true)).toBe(1 * 60 * 1000);
  });

  it('returns 0 when there is no gap', () => {
    expect(calculateUnaccountedPieDuration(baseStats, true)).toBe(0);
  });
});

describe('filterAndSortPieChartObservables', () => {
  it('drops observables with no duration and no count', () => {
    const observables = [
      mockObservable('obs-a', 'obsA', 0, 0, 0),
      mockObservable('obs-b', 'obsB', 60_000, 100, 1),
    ];

    expect(filterAndSortPieChartObservables(observables).map((o) => o.observableName)).toEqual([
      'obsB',
    ]);
  });

  it('sorts by descending duration', () => {
    const observables = [
      mockObservable('obs-a', 'obsA', 60_000, 0, 1),
      mockObservable('obs-b', 'obsB', 180_000, 0, 1),
      mockObservable('obs-c', 'obsC', 120_000, 0, 1),
    ];

    expect(filterAndSortPieChartObservables(observables).map((o) => o.observableName)).toEqual([
      'obsB',
      'obsC',
      'obsA',
    ]);
  });

  it('keeps the category declaration order for ties', () => {
    const observables = [
      mockObservable('obs-a', 'obsA', 60_000, 0, 1),
      mockObservable('obs-b', 'obsB', 60_000, 0, 1),
      mockObservable('obs-c', 'obsC', 120_000, 0, 1),
    ];

    expect(filterAndSortPieChartObservables(observables).map((o) => o.observableName)).toEqual([
      'obsC',
      'obsA',
      'obsB',
    ]);
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
