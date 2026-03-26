<template>
  <div class="column q-gutter-md">
    <div v-if="statistics.sharedState.loading" class="row justify-center q-pa-lg">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="statistics.sharedState.error" class="text-negative q-pa-md">
      {{ t('statisticsUi.errorPrefix') }} {{ statistics.sharedState.error }}
    </div>

    <div v-else-if="statistics.sharedState.generalStatistics" class="column q-gutter-md">
      <DCard bgColor="background">
        <DCardSection>
          <div class="text-h6 q-mb-md">{{ t('statisticsUi.generalSectionTitle') }}</div>
          
          <q-table
            :rows="tableRows"
            :columns="tableColumns"
            row-key="label"
            flat
            bordered
            :rows-per-page-options="[0]"
            hide-pagination
          />
        </DCardSection>
      </DCard>

      <DCard v-if="statistics.sharedState.generalStatistics.categories.length > 0" bgColor="background">
        <DCardSection>
          <div class="text-h6 q-mb-md">{{ t('statisticsUi.generalPerCategoryTitle') }}</div>
          
          <q-table
            :rows="categoryRows"
            :columns="categoryColumns"
            row-key="categoryId"
            flat
            bordered
            :rows-per-page-options="[0]"
            hide-pagination
          />
        </DCardSection>
      </DCard>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatistics } from 'src/composables/use-statistics';
import { DCard, DCardSection } from '@lib-improba/components';

export default defineComponent({
  name: 'GeneralStatisticsView',
  setup() {
    const { t } = useI18n();
    const statistics = useStatistics();

    const tableColumns = computed(() => [
      {
        name: 'label',
        label: t('statisticsUi.colMetric'),
        field: 'label',
        align: 'left' as const,
      },
      {
        name: 'value',
        label: t('statisticsUi.colValue'),
        field: 'value',
        align: 'right' as const,
      },
    ]);

    const categoryColumns = computed(() => [
      {
        name: 'categoryName',
        label: t('statisticsUi.colCategory'),
        field: 'categoryName',
        align: 'left' as const,
      },
      {
        name: 'activeObservablesCount',
        label: t('statisticsUi.colActiveObservables'),
        field: 'activeObservablesCount',
        align: 'center' as const,
      },
      {
        name: 'totalDuration',
        label: t('statisticsUi.colTotalDuration'),
        field: 'totalDuration',
        align: 'right' as const,
        format: (val: number) => statistics.methods.formatDuration(val),
      },
    ]);

    const tableRows = computed(() => {
      const stats = statistics.sharedState.generalStatistics;
      if (!stats) {
        return [];
      }

      return [
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
          value: stats.totalReadings.toString(),
        },
        {
          label: t('statisticsUi.metricPauseCount'),
          value: stats.pauseCount.toString(),
        },
        {
          label: t('statisticsUi.metricTotalPauseDuration'),
          value: statistics.methods.formatDuration(stats.pauseDuration),
        },
      ];
    });

    const categoryRows = computed(() => {
      const stats = statistics.sharedState.generalStatistics;
      if (!stats) {
        return [];
      }

      return stats.categories.map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        activeObservablesCount: cat.activeObservablesCount,
        totalDuration: cat.totalDuration,
      }));
    });

    return {
      t,
      statistics,
      tableColumns,
      categoryColumns,
      tableRows,
      categoryRows,
    };
  },
});
</script>
