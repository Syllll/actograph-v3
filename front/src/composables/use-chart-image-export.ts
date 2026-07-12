import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import type { Exporting } from '@amcharts/amcharts5/plugins/exporting';

export type ChartImageExportFormat = 'png' | 'jpg';

/**
 * Export PNG/JPEG d'un graphique amCharts5, avec le même menu que celui du
 * graphe d'activité (bouton "Exporter" + sélecteur de format).
 */
export const useChartImageExport = (getExporting: () => Exporting | null) => {
  const { t } = useI18n();
  const $q = useQuasar();

  const exportSelection = reactive<{ format: ChartImageExportFormat }>({
    format: 'png',
  });

  const exportFormatOptions: Array<{ label: string; value: ChartImageExportFormat }> = [
    { label: 'PNG', value: 'png' },
    { label: 'JPEG', value: 'jpg' },
  ];

  const runExport = async () => {
    const exporting = getExporting();
    if (!exporting) {
      $q.notify({ type: 'warning', message: t('graphUi.exportNotReady') });
      return;
    }

    try {
      await exporting.download(exportSelection.format);
      $q.notify({
        type: 'positive',
        message: t('graphUi.exportedFormat', {
          what: t('graphUi.exportContentGraph'),
          format: exportSelection.format.toUpperCase(),
        }),
        timeout: 3000,
      });
    } catch (error) {
      console.error('Failed to export chart image:', error);
    }
  };

  return {
    exportSelection,
    exportFormatOptions,
    runExport,
  };
};
