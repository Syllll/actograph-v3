import {
  buildStatisticsExportFileName,
  buildStatisticsWorksheets,
  formatObservableOnPercentage,
  resolveTotalCategoryDuration,
  sumTargetCategoryOccurrences,
} from '../statistics-export.utils';

const t = (key: string) => key;
const formatDuration = (ms: number) => `${ms}ms`;

describe('buildStatisticsExportFileName', () => {
  it('sanitizes unsafe filesystem characters', () => {
    expect(buildStatisticsExportFileName('Test/Chronique:01')).toBe(
      'Test-Chronique-01-statistics',
    );
  });

  it('falls back when the observation name is empty', () => {
    expect(buildStatisticsExportFileName('   ')).toBe('statistics-statistics');
  });
});

describe('resolveTotalCategoryDuration', () => {
  it('uses the API total when provided', () => {
    expect(
      resolveTotalCategoryDuration({
        totalCategoryDuration: 500,
        observables: [{ onDuration: 100 } as any],
      }),
    ).toBe(500);
  });

  it('falls back to the sum of observable durations', () => {
    expect(
      resolveTotalCategoryDuration({
        totalCategoryDuration: 0,
        observables: [
          { onDuration: 250 } as any,
          { onDuration: 750 } as any,
        ],
      }),
    ).toBe(1000);
  });

  it('prefers observationDuration over the sum of observable durations, so an unattributed gap is not silently absorbed', () => {
    // First observable starts after the observation window's true start: the
    // sum of on-durations (1000) is less than the real window (1200).
    expect(
      resolveTotalCategoryDuration({
        totalCategoryDuration: 1000,
        observationDuration: 1200,
        observables: [
          { onDuration: 250 } as any,
          { onDuration: 750 } as any,
        ],
      }),
    ).toBe(1200);
  });
});

describe('formatObservableOnPercentage', () => {
  it('recalculates percentages when the API returns zero', () => {
    expect(
      formatObservableOnPercentage({ onDuration: 250, onPercentage: 0 }, 1000),
    ).toBe('25.0%');
  });

  it('keeps API percentages when present', () => {
    expect(
      formatObservableOnPercentage({ onDuration: 250, onPercentage: 33.3 }, 1000),
    ).toBe('33.3%');
  });
});

describe('sumTargetCategoryOccurrences', () => {
  it('sums onCount across observables', () => {
    expect(
      sumTargetCategoryOccurrences([
        { onCount: 2 } as any,
        { onCount: 3 } as any,
        { onCount: 0 } as any,
      ]),
    ).toBe(5);
  });
});

describe('buildStatisticsWorksheets', () => {
  const generalStatistics = {
    totalDuration: 1000,
    observationDuration: 900,
    totalReadings: 3,
    pauseCount: 1,
    pauseDuration: 100,
    categories: [
      {
        categoryId: 'cat-1',
        categoryName: 'Cat A',
        activeObservablesCount: 2,
        totalDuration: 400,
      },
    ],
  };

  it('builds general and per-category sheets', () => {
    const worksheets = buildStatisticsWorksheets({
      activeTab: 'general',
      generalStatistics,
      categoryStatistics: null,
      conditionalStatistics: null,
      t,
      formatDuration,
    });

    expect(worksheets).toHaveLength(2);
    expect(worksheets?.[0].name).toBe('statisticsUi.exportSheetGeneral');
    expect(worksheets?.[1].rows).toHaveLength(1);
  });

  it('returns null for category tab without observables', () => {
    expect(
      buildStatisticsWorksheets({
        activeTab: 'category',
        generalStatistics: null,
        categoryStatistics: {
          categoryId: 'cat-1',
          categoryName: 'Cat A',
          observables: [],
        },
        conditionalStatistics: null,
        t,
        formatDuration,
      }),
    ).toBeNull();
  });

  it('exports advanced stats with recalculated percentages', () => {
    const worksheets = buildStatisticsWorksheets({
      activeTab: 'advanced',
      generalStatistics: null,
      categoryStatistics: null,
      conditionalStatistics: {
        filteredDuration: 500,
        conditions: [],
        targetCategory: {
          categoryId: 'cat-1',
          categoryName: 'Cat A',
          totalCategoryDuration: 0,
          observables: [
            {
              observableId: 'obs-1',
              observableName: 'Obs 1',
              onDuration: 250,
              onPercentage: 0,
              onCount: 2,
            },
            {
              observableId: 'obs-2',
              observableName: 'Obs 2',
              onDuration: 0,
              onPercentage: 0,
              onCount: 0,
            },
          ],
        },
      },
      t,
      formatDuration,
    });

    expect(worksheets?.[0].rows).toHaveLength(2);
    expect(worksheets?.[0].rows?.[0].onDuration).toBe('500ms');
    expect(worksheets?.[0].rows?.[1].onPercentage).toBe('100.0%');
  });

  it('exports discrete advanced stats with filtered occurrence summary', () => {
    const worksheets = buildStatisticsWorksheets({
      activeTab: 'advanced',
      generalStatistics: null,
      categoryStatistics: null,
      conditionalStatistics: {
        filteredDuration: 500,
        conditions: [],
        targetCategory: {
          categoryId: 'cat-events',
          categoryName: 'Events',
          totalCategoryDuration: 0,
          observables: [
            {
              observableId: 'obs-1',
              observableName: 'Click',
              onDuration: 0,
              onPercentage: 0,
              onCount: 2,
            },
            {
              observableId: 'obs-2',
              observableName: 'Signal',
              onDuration: 0,
              onPercentage: 0,
              onCount: 1,
            },
          ],
        },
      },
      targetCategoryIsContinuous: false,
      t,
      formatDuration,
    });

    expect(worksheets?.[0].rows?.[0].observableName).toBe(
      'statisticsUi.colFilteredOccurrences (Events)',
    );
    expect(worksheets?.[0].rows?.[0].onDuration).toBe('');
    expect(worksheets?.[0].rows?.[0].onCount).toBe(3);
  });
});
