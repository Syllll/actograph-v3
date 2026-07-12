import {
  buildCategoryPieChartData,
  buildCategoryPieChartColors,
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

describe('buildCategoryPieChartData', () => {
  it('adds a pause segment when treatPausesAsSeparateState is on', () => {
    const data = buildCategoryPieChartData(baseStats, {
      treatPausesAsSeparateState: true,
      pauseSegmentLabel: 'Pause',
    });

    expect(data).toHaveLength(3);
    expect(data[2]).toEqual({
      label: 'Pause',
      value: 10,
    });
  });

  it('sums to 100% in separate-state mode with pauses', () => {
    const data = buildCategoryPieChartData(baseStats, {
      treatPausesAsSeparateState: true,
      pauseSegmentLabel: 'Pause',
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
    });

    expect(data).toHaveLength(2);
    expect(data.some((segment) => segment.label === 'Pause')).toBe(false);

    const total = data.reduce((sum, segment) => sum + segment.value, 0);
    expect(total).toBeCloseTo(100, 5);
  });
});

describe('buildCategoryPieChartColors', () => {
  it('appends the pause color only when the pause segment is shown', () => {
    expect(buildCategoryPieChartColors(true, 60_000)).toHaveLength(9);
    expect(buildCategoryPieChartColors(false, 60_000)).toHaveLength(8);
  });
});
