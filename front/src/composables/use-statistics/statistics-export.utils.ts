import { IWorksheet } from '@lib-improba/utils/export.utils';
import {
  ICategoryStatistics,
  IConditionalStatistics,
  IGeneralStatistics,
  IObservableStatistics,
} from '@services/observations/statistics.interface';

export type StatisticsExportTab = 'general' | 'category' | 'advanced';
type TranslateFn = (key: string) => string;
type FormatDurationFn = (ms: number) => string;

export const buildStatisticsExportFileName = (observationName?: string | null): string => {
  const safeName = (
    (observationName || 'statistics').replace(/[<>:"/\\|?*]/g, '-').trim() || 'statistics'
  ).slice(0, 100);
  return `${safeName}-statistics`;
};

export const resolveTotalCategoryDuration = (
  category: Pick<
    ICategoryStatistics,
    'totalCategoryDuration' | 'observables' | 'observationDuration'
  >,
): number => {
  // Prefer the real observation window (first START to last STOP): it's the
  // only basis that accounts for time not covered by any observable (e.g. a
  // gap before the first observable of the category was recorded). Falling
  // back to the sum of on-durations silently absorbs that gap into the other
  // percentages instead of exposing it.
  if (category.observationDuration && category.observationDuration > 0) {
    return category.observationDuration;
  }

  let totalCategoryDuration = category.totalCategoryDuration || 0;
  if (totalCategoryDuration === 0) {
    totalCategoryDuration = category.observables.reduce(
      (sum, obs) => sum + (obs.onDuration || 0),
      0,
    );
  }
  return totalCategoryDuration;
};

export const formatObservableOnPercentage = (
  obs: Pick<IObservableStatistics, 'onDuration' | 'onPercentage'>,
  totalCategoryDuration: number,
): string => {
  let percentage = obs.onPercentage || 0;
  if (totalCategoryDuration > 0 && percentage === 0 && obs.onDuration > 0) {
    percentage = (obs.onDuration / totalCategoryDuration) * 100;
  }
  return `${percentage.toFixed(1)}%`;
};

export const sumTargetCategoryOccurrences = (
  observables: Pick<IObservableStatistics, 'onCount'>[] | undefined,
): number => {
  if (!observables) {
    return 0;
  }
  return observables.reduce((sum, obs) => sum + (obs.onCount || 0), 0);
};

export interface BuildStatisticsWorksheetsInput {
  activeTab: StatisticsExportTab;
  generalStatistics: IGeneralStatistics | null;
  categoryStatistics: ICategoryStatistics | null;
  conditionalStatistics: IConditionalStatistics | null;
  /** Required for advanced tab export; defaults to continuous when omitted. */
  targetCategoryIsContinuous?: boolean;
  t: TranslateFn;
  formatDuration: FormatDurationFn;
}

export const buildStatisticsWorksheets = (
  input: BuildStatisticsWorksheetsInput,
): IWorksheet[] | null => {
  const {
    activeTab,
    generalStatistics,
    categoryStatistics,
    conditionalStatistics,
    targetCategoryIsContinuous = true,
    t,
    formatDuration,
  } = input;

  if (activeTab === 'general') {
    if (!generalStatistics) return null;

    const worksheets: IWorksheet[] = [
      {
        name: t('statisticsUi.exportSheetGeneral'),
        columns: [
          { header: t('statisticsUi.colMetric'), key: 'label', width: 40 },
          { header: t('statisticsUi.colValue'), key: 'value', width: 20 },
        ],
        rows: [
          {
            label: t('statisticsUi.metricTotalObservationDuration'),
            value: formatDuration(generalStatistics.totalDuration),
          },
          {
            label: t('statisticsUi.metricObservationDurationExclPauses'),
            value: formatDuration(generalStatistics.observationDuration),
          },
          {
            label: t('statisticsUi.metricTotalReadings'),
            value: generalStatistics.totalReadings,
          },
          {
            label: t('statisticsUi.metricPauseCount'),
            value: generalStatistics.pauseCount,
          },
          {
            label: t('statisticsUi.metricTotalPauseDuration'),
            value: formatDuration(generalStatistics.pauseDuration),
          },
        ],
      },
    ];

    if (generalStatistics.categories.length > 0) {
      worksheets.push({
        name: t('statisticsUi.exportSheetGeneralByCategory'),
        columns: [
          { header: t('statisticsUi.colCategory'), key: 'categoryName', width: 30 },
          { header: t('statisticsUi.colActiveObservables'), key: 'activeObservablesCount', width: 20 },
          { header: t('statisticsUi.colTotalDuration'), key: 'totalDuration', width: 20 },
        ],
        rows: generalStatistics.categories.map((cat) => ({
          categoryName: cat.categoryName,
          activeObservablesCount: cat.activeObservablesCount,
          totalDuration: formatDuration(cat.totalDuration),
        })),
      });
    }

    return worksheets;
  }

  if (activeTab === 'category') {
    if (!categoryStatistics?.observables?.length) return null;

    const totalCategoryDuration = resolveTotalCategoryDuration(categoryStatistics);

    return [
      {
        name: `${t('statisticsUi.exportSheetCategory')} - ${categoryStatistics.categoryName}`,
        columns: [
          { header: t('statisticsUi.colObservable'), key: 'observableName', width: 30 },
          { header: t('statisticsUi.colOnDuration'), key: 'onDuration', width: 20 },
          { header: t('statisticsUi.colOnPercentage'), key: 'onPercentage', width: 20 },
          { header: t('statisticsUi.colOccurrences'), key: 'onCount', width: 15 },
        ],
        rows: categoryStatistics.observables.map((obs) => ({
          observableName: obs.observableName,
          onDuration: formatDuration(obs.onDuration),
          onPercentage: formatObservableOnPercentage(obs, totalCategoryDuration),
          onCount: obs.onCount,
        })),
      },
    ];
  }

  if (activeTab === 'advanced') {
    if (!conditionalStatistics?.targetCategory) return null;

    const { targetCategory } = conditionalStatistics;
    const totalCategoryDuration = resolveTotalCategoryDuration(targetCategory);
    const observableRows = (targetCategory.observables || [])
      .filter((obs) => obs.onDuration > 0 || obs.onCount > 0)
      .map((obs) => ({
        observableName: obs.observableName,
        onDuration: formatDuration(obs.onDuration),
        onPercentage: formatObservableOnPercentage(obs, totalCategoryDuration),
        onCount: obs.onCount,
      }));

    const summaryRow = targetCategoryIsContinuous
      ? {
          observableName: `${t('statisticsUi.colFilteredDuration')} (${targetCategory.categoryName})`,
          onDuration: formatDuration(conditionalStatistics.filteredDuration),
          onPercentage: '',
          onCount: '',
        }
      : {
          observableName: `${t('statisticsUi.colFilteredOccurrences')} (${targetCategory.categoryName})`,
          onDuration: '',
          onPercentage: '',
          onCount: sumTargetCategoryOccurrences(targetCategory.observables),
        };

    return [
      {
        name: t('statisticsUi.exportSheetConditional'),
        columns: [
          { header: t('statisticsUi.colObservable'), key: 'observableName', width: 30 },
          { header: t('statisticsUi.colOnDuration'), key: 'onDuration', width: 20 },
          { header: t('statisticsUi.colOnPercentage'), key: 'onPercentage', width: 20 },
          { header: t('statisticsUi.colOccurrences'), key: 'onCount', width: 15 },
        ],
        rows: [summaryRow, ...observableRows],
      },
    ];
  }

  return null;
};
