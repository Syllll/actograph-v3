<template>
  <DPage>
    <div v-if="!statistics.computedState.canCalculateStatistics.value" class="fit column items-center justify-center">
      <q-icon name="mdi-chart-box" size="64px" color="grey-6" class="q-mb-md" />
      <div class="text-h4 text-grey-7">{{ t('statisticsUi.emptyTitle') }}</div>
      <div class="text-body1 text-grey-6 q-mt-sm">
        {{ t('statisticsUi.emptyHint') }}
      </div>
    </div>

    <div v-else class="fit column relative-position">
      <div class="row items-center justify-between">
        <q-tabs
          v-model="state.activeTab"
          dense
          class="text-grey-7"
          active-color="primary"
          indicator-color="primary"
          align="left"
        >
          <q-tab name="general" :label="t('statisticsUi.tabGeneral')" />
          <q-tab name="category" :label="t('statisticsUi.tabByCategory')" />
          <q-tab name="advanced" :label="t('statisticsUi.tabAdvanced')" />
        </q-tabs>

        <q-btn
          flat
          round
          dense
          icon="mdi-file-excel-outline"
          color="grey-8"
          class="q-mr-sm"
          @click="methods.exportStatistics"
        >
          <q-tooltip>{{ t('statisticsUi.tooltipExportStats') }}</q-tooltip>
        </q-btn>
      </div>

      <q-separator />

      <q-tab-panels v-model="state.activeTab" animated class="col">
        <!-- Vue globale -->
        <q-tab-panel name="general" class="q-pa-md">
          <GeneralStatisticsView />
        </q-tab-panel>

        <!-- Par catégorie -->
        <q-tab-panel name="category" class="q-pa-md">
          <CategoryStatisticsView />
        </q-tab-panel>

        <!-- Mode avancé -->
        <q-tab-panel name="advanced" class="q-pa-md">
          <ConditionalStatisticsView />
        </q-tab-panel>
      </q-tab-panels>

      <q-banner
        v-if="isStudentAccess"
        dense
        rounded
        class="student-stats-notice q-ma-sm"
      >
        <template #avatar>
          <q-icon name="mdi-school-outline" color="warning" />
        </template>
        {{ t('licenseUi.studentStatsNotice') }}
      </q-banner>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import { useStatistics } from 'src/composables/use-statistics';
import { useObservation } from 'src/composables/use-observation';
import { useLicense } from 'src/composables/use-license';
import { emitChartsRefresh } from 'src/composables/use-app-resume';
import { DPage } from '@lib-improba/components';
import { exportDataWithDialog, IWorksheet } from '@lib-improba/utils/export.utils';
import GeneralStatisticsView from './_components/GeneralStatisticsView.vue';
import CategoryStatisticsView from './_components/CategoryStatisticsView.vue';
import ConditionalStatisticsView from './_components/ConditionalStatisticsView.vue';

export default defineComponent({
  name: 'StatisticsPage',
  components: {
    GeneralStatisticsView,
    CategoryStatisticsView,
    ConditionalStatisticsView,
  },
  setup() {
    const { t } = useI18n();
    const $q = useQuasar();
    const statistics = useStatistics();
    const observation = useObservation();
    const { isStudentAccess } = useLicense();

    const state = reactive({
      activeTab: 'general',
    });

    const methods = {
      buildDefaultFileName: (): string => {
        const observationName =
          observation.sharedState.currentObservation?.name || 'statistics';
        const safeName = (
          observationName.replace(/[<>:"/\\|?*]/g, '-').trim() || 'statistics'
        ).slice(0, 100);
        return `${safeName}-statistics`;
      },

      formatOnPercentage: (
        obs: { onDuration: number; onPercentage: number },
        totalCategoryDuration: number,
      ): string => {
        let percentage = obs.onPercentage || 0;
        if (totalCategoryDuration > 0 && percentage === 0 && obs.onDuration > 0) {
          percentage = (obs.onDuration / totalCategoryDuration) * 100;
        }
        return `${percentage.toFixed(1)}%`;
      },

      exportStatistics: async () => {
        const worksheets = methods.buildWorksheets();
        if (!worksheets || worksheets.length === 0) {
          $q.notify({ type: 'warning', message: t('statisticsUi.exportNoData') });
          return;
        }
        try {
          await exportDataWithDialog({
            worksheets,
            defaultFileName: methods.buildDefaultFileName(),
          });
        } catch (error) {
          console.error('Failed to export statistics:', error);
          $q.notify({ type: 'negative', message: t('statisticsUi.exportFailed') });
        }
      },

      buildWorksheets: (): IWorksheet[] | null => {
        if (state.activeTab === 'general') {
          const stats = statistics.sharedState.generalStatistics;
          if (!stats) return null;

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
                  value: statistics.methods.formatDuration(stats.totalDuration),
                },
                {
                  label: t('statisticsUi.metricObservationDurationExclPauses'),
                  value: statistics.methods.formatDuration(stats.observationDuration),
                },
                {
                  label: t('statisticsUi.metricTotalReadings'),
                  value: stats.totalReadings,
                },
                {
                  label: t('statisticsUi.metricPauseCount'),
                  value: stats.pauseCount,
                },
                {
                  label: t('statisticsUi.metricTotalPauseDuration'),
                  value: statistics.methods.formatDuration(stats.pauseDuration),
                },
              ],
            },
          ];

          if (stats.categories.length > 0) {
            worksheets.push({
              name: t('statisticsUi.exportSheetGeneralByCategory'),
              columns: [
                { header: t('statisticsUi.colCategory'), key: 'categoryName', width: 30 },
                { header: t('statisticsUi.colActiveObservables'), key: 'activeObservablesCount', width: 20 },
                { header: t('statisticsUi.colTotalDuration'), key: 'totalDuration', width: 20 },
              ],
              rows: stats.categories.map((cat) => ({
                categoryName: cat.categoryName,
                activeObservablesCount: cat.activeObservablesCount,
                totalDuration: statistics.methods.formatDuration(cat.totalDuration),
              })),
            });
          }

          return worksheets;
        }

        if (state.activeTab === 'category') {
          const stats = statistics.sharedState.categoryStatistics;
          if (!stats || !stats.observables || stats.observables.length === 0) return null;

          return [
            {
              name: `${t('statisticsUi.exportSheetCategory')} - ${stats.categoryName}`,
              columns: [
                { header: t('statisticsUi.colObservable'), key: 'observableName', width: 30 },
                { header: t('statisticsUi.colOnDuration'), key: 'onDuration', width: 20 },
                { header: t('statisticsUi.colOnPercentage'), key: 'onPercentage', width: 20 },
                { header: t('statisticsUi.colOccurrences'), key: 'onCount', width: 15 },
              ],
              rows: stats.observables.map((obs) => ({
                observableName: obs.observableName,
                onDuration: statistics.methods.formatDuration(obs.onDuration),
                onPercentage: `${(obs.onPercentage || 0).toFixed(1)}%`,
                onCount: obs.onCount,
              })),
            },
          ];
        }

        if (state.activeTab === 'advanced') {
          const stats = statistics.sharedState.conditionalStatistics;
          if (!stats || !stats.targetCategory || !stats.targetCategory.observables) return null;

          let totalCategoryDuration = stats.targetCategory.totalCategoryDuration || 0;
          if (totalCategoryDuration === 0) {
            totalCategoryDuration = stats.targetCategory.observables.reduce(
              (sum, obs) => sum + (obs.onDuration || 0),
              0,
            );
          }

          return [
            {
              name: t('statisticsUi.exportSheetConditional'),
              columns: [
                { header: t('statisticsUi.colObservable'), key: 'observableName', width: 30 },
                { header: t('statisticsUi.colOnDuration'), key: 'onDuration', width: 20 },
                { header: t('statisticsUi.colOnPercentage'), key: 'onPercentage', width: 20 },
                { header: t('statisticsUi.colOccurrences'), key: 'onCount', width: 15 },
              ],
              rows: [
                {
                  observableName: `${t('statisticsUi.colFilteredDuration')} (${stats.targetCategory.categoryName})`,
                  onDuration: statistics.methods.formatDuration(stats.filteredDuration),
                  onPercentage: '',
                  onCount: '',
                },
                ...stats.targetCategory.observables.map((obs) => ({
                  observableName: obs.observableName,
                  onDuration: statistics.methods.formatDuration(obs.onDuration),
                  onPercentage: methods.formatOnPercentage(obs, totalCategoryDuration),
                  onCount: obs.onCount,
                })),
              ],
            },
          ];
        }

        return null;
      },
    };

    onMounted(async () => {
      // Load general statistics on mount
      if (statistics.computedState.canCalculateStatistics.value) {
        try {
          await statistics.methods.loadGeneralStatistics();
        } catch (error) {
          console.error('Failed to load general statistics:', error);
        }
      }
    });

    watch(
      () => state.activeTab,
      (tab) => {
        if (tab === 'category' || tab === 'advanced') {
          emitChartsRefresh();
        }
      }
    );

    return {
      t,
      statistics,
      observation,
      state,
      methods,
      isStudentAccess,
    };
  },
});
</script>

<style scoped lang="scss">
.student-stats-notice {
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
  font-size: 0.85rem;
}
</style>
