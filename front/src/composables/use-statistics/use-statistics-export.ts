import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import { exportDataWithDialog } from '@lib-improba/utils/export.utils';
import { useObservation } from 'src/composables/use-observation';
import { useStatistics } from './index';
import {
  buildStatisticsExportFileName,
  buildStatisticsWorksheets,
  StatisticsExportTab,
} from './statistics-export.utils';

export const useStatisticsExport = (getActiveTab: () => StatisticsExportTab) => {
  const { t } = useI18n();
  const $q = useQuasar();
  const statistics = useStatistics();
  const observation = useObservation();

  const exportStatistics = async () => {
    if (statistics.sharedState.loading) return;

    const worksheets = buildStatisticsWorksheets({
      activeTab: getActiveTab(),
      generalStatistics: statistics.sharedState.generalStatistics,
      categoryStatistics: statistics.sharedState.categoryStatistics,
      conditionalStatistics: statistics.sharedState.conditionalStatistics,
      t,
      formatDuration: statistics.methods.formatDuration,
    });

    if (!worksheets || worksheets.length === 0) {
      $q.notify({ type: 'warning', message: t('statisticsUi.exportNoData') });
      return;
    }

    try {
      await exportDataWithDialog({
        worksheets,
        defaultFileName: buildStatisticsExportFileName(
          observation.sharedState.currentObservation?.name,
        ),
      });
    } catch (error) {
      console.error('Failed to export statistics:', error);
      $q.notify({ type: 'negative', message: t('statisticsUi.exportFailed') });
    }
  };

  return {
    exportStatistics,
  };
};
