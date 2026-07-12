import { computed, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import { exportData } from '@lib-improba/utils/export.utils';
import { useObservation } from 'src/composables/use-observation';
import { useStatistics } from './index';
import {
  buildStatisticsExportFileName,
  buildStatisticsWorksheets,
  StatisticsExportTab,
} from './statistics-export.utils';

export type StatisticsExportFormat = 'excel' | 'csv';

export const useStatisticsExport = (getActiveTab: () => StatisticsExportTab) => {
  const { t } = useI18n();
  const $q = useQuasar();
  const statistics = useStatistics();
  const observation = useObservation();

  const exportSelection = reactive<{ format: StatisticsExportFormat }>({
    format: 'excel',
  });

  const getWorksheets = () =>
    buildStatisticsWorksheets({
      activeTab: getActiveTab(),
      generalStatistics: statistics.sharedState.generalStatistics,
      categoryStatistics: statistics.sharedState.categoryStatistics,
      conditionalStatistics: statistics.sharedState.conditionalStatistics,
      t,
      formatDuration: statistics.methods.formatDuration,
    });

  const requiresExcelOnly = computed(() => (getWorksheets()?.length ?? 0) > 1);

  const exportFormatOptions = computed(() => {
    const options: Array<{ label: string; value: StatisticsExportFormat }> = [
      { label: t('statisticsUi.exportFormatExcel'), value: 'excel' },
    ];

    if (!requiresExcelOnly.value) {
      options.push({ label: t('statisticsUi.exportFormatCsv'), value: 'csv' });
    }

    return options;
  });

  watch(requiresExcelOnly, (excelOnly) => {
    if (excelOnly) {
      exportSelection.format = 'excel';
    }
  });

  const runExport = async () => {
    if (statistics.sharedState.loading) return;

    const worksheets = getWorksheets();
    if (!worksheets || worksheets.length === 0) {
      $q.notify({ type: 'warning', message: t('statisticsUi.exportNoData') });
      return;
    }

    const format = requiresExcelOnly.value ? 'excel' : exportSelection.format;

    try {
      await exportData({
        type: format,
        fileName: buildStatisticsExportFileName(
          observation.sharedState.currentObservation?.name,
        ),
        worksheets,
      });

      $q.notify({
        type: 'positive',
        message: t('statisticsUi.exportedFormat', {
          format: format.toUpperCase(),
        }),
        timeout: 3000,
      });
    } catch (error) {
      console.error('Failed to export statistics:', error);
      $q.notify({ type: 'negative', message: t('statisticsUi.exportFailed') });
    }
  };

  return {
    exportSelection,
    exportFormatOptions,
    requiresExcelOnly,
    runExport,
  };
};
