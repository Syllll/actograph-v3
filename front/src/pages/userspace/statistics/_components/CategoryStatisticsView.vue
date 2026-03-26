<template>
  <div class="column q-gutter-md">
    <DCard bgColor="background">
      <DCardSection>
        <div class="text-h6 q-mb-md">{{ t('statisticsUi.categoryPickerTitle') }}</div>
        <q-select
          v-model="state.selectedCategoryId"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          :placeholder="t('statisticsUi.selectCategoryPlaceholder')"
          @update:model-value="methods.loadCategoryStatistics"
        />
      </DCardSection>
    </DCard>

    <div v-if="statistics.sharedState.loading" class="row justify-center q-pa-lg">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="statistics.sharedState.categoryStatistics" class="column q-gutter-md">
      <DCard bgColor="background">
        <DCardSection>
          <div class="text-h6 q-mb-md">
            {{ t('statisticsUi.categoryStatsHeading', {
              name: statistics.sharedState.categoryStatistics.categoryName,
            }) }}
          </div>

          <div v-if="isContinuousCategory" class="q-mb-lg">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-subtitle2">
                {{ t('statisticsUi.categoryOnTimePieTitle') }}
              </div>
              <q-toggle
                v-model="state.showPauseInPieChart"
                :label="t('statisticsUi.toggleIncludePauses')"
                dense
              />
            </div>
            <AmChartsPieChart
              :data="pieChartData"
              :colors="pieChartColors"
              :height="400"
            />
          </div>

          <div>
            <div class="text-subtitle2 q-mb-sm">{{ t('statisticsUi.categoryOccurrencesChartTitle') }}</div>
            <AmChartsBarChart
              :data="occurrencesBarChartData"
              :colors="barChartColors"
              :height="400"
            />
          </div>
        </DCardSection>
      </DCard>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatistics } from 'src/composables/use-statistics';
import { useObservation } from 'src/composables/use-observation';
import { DCard, DCardSection } from '@lib-improba/components';
import {
  ProtocolItemActionEnum,
  protocolService,
} from '@services/observations/protocol.service';
import AmChartsPieChart from './AmChartsPieChart.vue';
import AmChartsBarChart from './AmChartsBarChart.vue';

function formatOccurrenceCount(t: (key: string, values?: Record<string, unknown>) => string, n: number) {
  return n === 1
    ? t('statisticsUi.occurrenceCountOne', { count: n })
    : t('statisticsUi.occurrenceCountOther', { count: n });
}

export default defineComponent({
  name: 'CategoryStatisticsView',
  components: {
    AmChartsPieChart,
    AmChartsBarChart,
  },
  setup() {
    const { t } = useI18n();
    const statistics = useStatistics();
    const observation = useObservation();

    const state = reactive({
      selectedCategoryId: null as string | null,
      showPauseInPieChart: false,
    });

    const categoryOptions = computed(() => {
      if (!observation.protocol || !observation.protocol.sharedState) {
        return [];
      }
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) {
        return [];
      }

      return protocol._items
        .filter((item: { type?: string }) => item.type === 'category')
        .map((item: { name?: string; id?: string }) => ({
          label: item.name,
          value: item.id,
        }));
    });

    const methods = {
      loadCategoryStatistics: async () => {
        if (state.selectedCategoryId) {
          try {
            await statistics.methods.loadCategoryStatistics(
              state.selectedCategoryId,
            );
          } catch (error) {
            console.error('Failed to load category statistics:', error);
          }
        }
      },
    };

    watch(
      categoryOptions,
      (options) => {
        if (options.length > 0 && !state.selectedCategoryId) {
          state.selectedCategoryId = options[0].value;
          methods.loadCategoryStatistics();
        }
      },
      { immediate: true },
    );

    const pieChartData = computed(() => {
      const stats = statistics.sharedState.categoryStatistics;
      if (!stats || !stats.observables || stats.observables.length === 0) {
        return [];
      }

      let totalCategoryDuration = stats.totalCategoryDuration || 0;
      if (totalCategoryDuration === 0) {
        totalCategoryDuration = stats.observables.reduce(
          (sum, obs) => sum + (obs.onDuration || 0),
          0,
        );
      }
      const pauseDuration = stats.pauseDuration || 0;
      const totalWithPause = totalCategoryDuration + pauseDuration;

      const data = stats.observables
        .filter((obs) => {
          const hasDuration = obs.onDuration > 0;
          const hasCount = obs.onCount > 0;
          return hasDuration || hasCount;
        })
        .map((obs) => {
          const percentage = obs.onPercentage || 0;
          return {
            label: obs.observableName,
            value: Math.max(0, percentage),
          };
        });

      if (state.showPauseInPieChart && pauseDuration > 0 && totalWithPause > 0) {
        const pausePercentage = (pauseDuration / totalWithPause) * 100;
        data.push({
          label: t('statisticsUi.pauseSegmentLabel'),
          value: pausePercentage,
        });
      }

      return data.length > 0 ? data : [];
    });

    const pieChartColors = computed(() => {
      const stats = statistics.sharedState.categoryStatistics;
      const baseColors = [
        '#1976D2',
        '#388E3C',
        '#F57C00',
        '#7B1FA2',
        '#C2185B',
        '#00796B',
        '#0288D1',
        '#5D4037',
      ];

      if (state.showPauseInPieChart && stats?.pauseDuration && stats.pauseDuration > 0) {
        return [...baseColors, '#9E9E9E'];
      }

      return baseColors;
    });

    const isContinuousCategory = computed(() => {
      if (!state.selectedCategoryId || !observation.protocol?.sharedState?.currentProtocol) {
        return true;
      }

      const protocol = observation.protocol.sharedState.currentProtocol;
      const items = protocolService.parseProtocolItems(protocol);

      const findCategory = (nodes: unknown[]): unknown => {
        for (const item of nodes) {
          const node = item as { type?: string; id?: string; children?: unknown[] };
          if (node.type === 'category' && node.id === state.selectedCategoryId) {
            return item;
          }
          if (node.children) {
            const found = findCategory(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const category = findCategory(items) as { action?: string } | null;
      if (!category) {
        return true;
      }

      return !category.action || category.action === ProtocolItemActionEnum.Continuous;
    });

    const occurrencesBarChartData = computed(() => {
      const stats = statistics.sharedState.categoryStatistics;
      if (!stats || !stats.observables || stats.observables.length === 0) {
        return [];
      }

      const data = stats.observables
        .filter((obs) => obs.onCount > 0)
        .map((obs) => {
          const c = obs.onCount || 0;
          return {
            label: obs.observableName,
            value: c,
            formattedValue: formatOccurrenceCount(t, c),
          };
        });

      return data.length > 0 ? data : [];
    });

    const barChartColors = computed(() => {
      return '#1976D2';
    });

    return {
      t,
      statistics,
      observation,
      state,
      categoryOptions,
      methods,
      pieChartData,
      pieChartColors,
      occurrencesBarChartData,
      barChartColors,
      isContinuousCategory,
    };
  },
});
</script>
