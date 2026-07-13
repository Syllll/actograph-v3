<template>
  <div class="column q-gutter-md">
    <DCard bgColor="background">
      <DCardSection>
        <div class="text-h6 q-mb-md">{{ t('statisticsUi.conditionalTitle') }}</div>
        <div class="column q-gutter-md">
          <div class="column q-gutter-sm">
            <div class="text-subtitle2">{{ t('statisticsUi.step1Title') }}</div>
            <q-select
              v-model="state.targetCategoryId"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              :placeholder="t('statisticsUi.selectCategoryPlaceholder')"
              style="flex: 1;"
            />
          </div>

          <div v-if="state.targetCategoryId" class="column q-gutter-sm">
            <div class="text-subtitle2">{{ t('statisticsUi.step2Title') }}</div>
            <div class="text-body2 text-grey-7 q-mb-sm">
              {{ t('statisticsUi.step2Hint') }}
            </div>
            
            <div
              v-for="(condition, condIndex) in state.conditions"
              :key="condIndex"
              class="row items-center q-gutter-sm"
            >
              <q-select
                v-model="condition.observableName"
                :options="observableOptions"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                outlined
                dense
                :placeholder="t('statisticsUi.observablePlaceholder')"
                style="flex: 1;"
              />
              <div class="text-body2">{{ t('statisticsUi.conditionIs') }}</div>
              <q-select
                v-model="condition.state"
                :options="stateOptions"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                outlined
                dense
                style="min-width: 120px;"
              />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="methods.removeCondition(condIndex)"
                v-if="state.conditions.length > 0"
              />
            </div>

            <q-btn
              flat
              dense
              icon="add"
              :label="t('statisticsUi.addCondition')"
              @click="methods.addCondition"
              color="primary"
            />
          </div>

          <div class="row items-center justify-end q-mt-md">
            <q-btn
              color="primary"
              :label="t('statisticsUi.calculate')"
              @click="methods.calculateConditionalStatistics"
              :disable="!methods.canCalculate"
              :loading="statistics.sharedState.loading"
            />
          </div>
        </div>
      </DCardSection>
    </DCard>

    <div v-if="statistics.sharedState.loading" class="row justify-center q-pa-lg">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="statistics.sharedState.conditionalStatistics" class="column q-gutter-md">
      <DCard bgColor="background">
        <DCardSection>
          <div class="text-h6 q-mb-md">
            {{ t('statisticsUi.resultsForCategory') }}
            {{ statistics.sharedState.conditionalStatistics.targetCategory.categoryName }}
          </div>
          <div v-if="state.conditions.length > 0" class="text-body2 q-mb-md">
            <div>{{ t('statisticsUi.filteredDurationIntro') }}</div>
            <div class="text-h6 text-primary">
              {{ statistics.methods.formatDuration(statistics.sharedState.conditionalStatistics.filteredDuration) }}
            </div>
          </div>

          <!-- Pie Chart -->
          <div class="q-mb-lg">
            <div class="text-subtitle2 q-mb-sm">
              {{ t('statisticsUi.pieShareTitle') }}
            </div>
            <AmChartsPieChart
              :data="pieChartData"
              :colors="pieChartColors"
              :height="400"
            />
          </div>

          <!-- Bar Chart -->
          <div>
            <div class="text-subtitle2 q-mb-sm">{{ t('statisticsUi.barOnDurationTitle') }}</div>
            <AmChartsBarChart
              :data="barChartData"
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
  ConditionOperatorEnum,
  ObservableStateEnum,
  IConditionGroup,
  IObservableCondition,
} from '@services/observations/statistics.interface';
import { getObservableGraphPreferences } from '@services/observations/protocol-graph-preferences.utils';
import { DEFAULT_GRAPH_COLOR } from '@actograph/graph';
import {
  buildCategoryPieChartColors,
  buildCategoryPieChartData,
  calculateUnaccountedPieDuration,
  CATEGORY_PIE_CHART_BASE_COLORS,
} from 'src/composables/use-statistics/category-pie-chart.utils';
import AmChartsPieChart from './AmChartsPieChart.vue';
import AmChartsBarChart from './AmChartsBarChart.vue';

export default defineComponent({
  name: 'ConditionalStatisticsView',
  components: {
    AmChartsPieChart,
    AmChartsBarChart,
  },
  setup() {
    const { t } = useI18n();
    const statistics = useStatistics();
    const observation = useObservation();

    const state = reactive({
      targetCategoryId: null as string | null,
      conditions: [] as IObservableCondition[],
    });

    const operatorOptions = computed(() => [
      { label: t('statisticsUi.operatorAnd'), value: ConditionOperatorEnum.AND },
      { label: t('statisticsUi.operatorOr'), value: ConditionOperatorEnum.OR },
    ]);

    const stateOptions = computed(() => [
      { label: t('statisticsUi.stateOn'), value: ObservableStateEnum.ON },
      { label: t('statisticsUi.stateOff'), value: ObservableStateEnum.OFF },
    ]);

    // Observables filtrés : exclure ceux de la catégorie à étudier pour éviter
    // de combiner une catégorie avec elle-même dans les conditions
    const observableOptions = computed(() => {
      if (!observation.protocol || !observation.protocol.sharedState) {
        return [];
      }
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) {
        return [];
      }

      // Collecter les noms des observables de la catégorie sélectionnée
      const targetCategoryObservableNames = new Set<string>();
      if (state.targetCategoryId) {
        const targetCategory = protocol._items.find(
          (item: any) =>
            item.type === 'category' && item.id === state.targetCategoryId,
        );
        if (targetCategory?.children) {
          for (const child of targetCategory.children) {
            if (child.type === 'observable' && child.name) {
              targetCategoryObservableNames.add(child.name);
            }
          }
        }
      }

      const observables: Array<{ label: string; value: string }> = [];
      for (const item of protocol._items) {
        if (item.type === 'category' && item.children) {
          for (const child of item.children) {
            if (
              child.type === 'observable' &&
              child.name &&
              !targetCategoryObservableNames.has(child.name)
            ) {
              observables.push({
                label: child.name,
                value: child.name,
              });
            }
          }
        }
      }

      return observables;
    });

    // Réinitialiser les conditions avec des observables invalides quand la catégorie change
    watch(
      () => state.targetCategoryId,
      () => {
        const validNames = new Set(
          observableOptions.value.map((opt) => opt.value),
        );
        for (const condition of state.conditions) {
          if (
            condition.observableName &&
            !validNames.has(condition.observableName)
          ) {
            condition.observableName = '';
          }
        }
      },
    );

    const categoryOptions = computed(() => {
      if (!observation.protocol || !observation.protocol.sharedState) {
        return [];
      }
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) {
        return [];
      }

      return protocol._items
        .filter((item: any) => item.type === 'category')
        .map((item: any) => ({
          label: item.name,
          value: item.id,
        }));
    });

    const methods = {
      addCondition: () => {
        state.conditions.push({
          observableName: '',
          state: ObservableStateEnum.ON,
        });
      },

      removeCondition: (index: number) => {
        state.conditions.splice(index, 1);
      },

      get canCalculate(): boolean {
        if (!state.targetCategoryId) {
          return false;
        }

        // Vérifier que toutes les conditions ont un observable sélectionné
        for (const condition of state.conditions) {
          if (!condition.observableName) {
            return false;
          }
        }

        return true;
      },

      calculateConditionalStatistics: async () => {
        if (!methods.canCalculate || !state.targetCategoryId) {
          return;
        }

        try {
          // Construire les groupes de conditions (un seul groupe avec toutes les conditions)
          const conditionGroups: IConditionGroup[] = state.conditions.length > 0
            ? [
                {
                  observables: state.conditions,
                  operator: ConditionOperatorEnum.AND,
                },
              ]
            : [];

          await statistics.methods.loadConditionalStatistics({
            conditionGroups,
            groupOperator: ConditionOperatorEnum.AND,
            targetCategoryId: state.targetCategoryId,
          });
        } catch (error) {
          console.error('Failed to calculate conditional statistics:', error);
        }
      },
    };

    // The conditional tab doesn't expose a pause-as-separate-state toggle, so
    // its pie never shows a pause segment; it only needs the "unaccounted"
    // gap segment for consistency with the category tab (see
    // category-pie-chart.utils.ts / calculateUnaccountedPieDuration).
    const unaccountedPieDuration = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      return stats?.targetCategory
        ? calculateUnaccountedPieDuration(stats.targetCategory, false)
        : 0;
    });

    const pieChartData = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      if (!stats || !stats.targetCategory || !stats.targetCategory.observables) {
        return [];
      }

      return buildCategoryPieChartData(stats.targetCategory, {
        treatPausesAsSeparateState: false,
        pauseSegmentLabel: t('statisticsUi.pauseSegmentLabel'),
        unaccountedSegmentLabel: t('statisticsUi.unaccountedSegmentLabel'),
      });
    });

    const resolveObservableColor = (observableId: string, index: number): string => {
      const protocol = observation.protocol?.sharedState?.currentProtocol;
      const preferences = protocol
        ? getObservableGraphPreferences(observableId, protocol)
        : null;
      return (
        preferences?.color ||
        CATEGORY_PIE_CHART_BASE_COLORS[index % CATEGORY_PIE_CHART_BASE_COLORS.length]
      );
    };

    const resolveCategoryColor = (categoryId: string | null): string => {
      const protocol = observation.protocol?.sharedState?.currentProtocol;
      const category = protocol?._items?.find(
        (item: { type?: string; id?: string }) =>
          item.type === 'category' && item.id === categoryId,
      ) as { graphPreferences?: { color?: string } } | undefined;
      return category?.graphPreferences?.color || DEFAULT_GRAPH_COLOR;
    };

    const pieChartColors = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      const observables =
        stats?.targetCategory?.observables?.filter(
          (obs) => obs.onDuration > 0 || obs.onCount > 0,
        ) || [];
      const resolvedColors = observables.map((obs, index) =>
        resolveObservableColor(obs.observableId, index),
      );

      return buildCategoryPieChartColors(
        false,
        0,
        resolvedColors,
        unaccountedPieDuration.value > 0,
      );
    });

    const barChartData = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      if (!stats || !stats.targetCategory || !stats.targetCategory.observables) {
        return [];
      }

      // Same filtering logic as CategoryStatisticsView
      const data = stats.targetCategory.observables
        .filter((obs) => obs.onDuration > 0 || obs.onCount > 0)
        .map((obs) => ({
          label: obs.observableName,
          value: obs.onDuration || 0,
          formattedValue: statistics.methods.formatDuration(obs.onDuration || 0),
        }));

      return data.length > 0 ? data : [];
    });

    const barChartColors = computed(() => {
      return resolveCategoryColor(state.targetCategoryId);
    });

    return {
      t,
      statistics,
      observation,
      state,
      operatorOptions,
      stateOptions,
      observableOptions,
      categoryOptions,
      methods,
      pieChartData,
      pieChartColors,
      barChartData,
      barChartColors,
    };
  },
});
</script>

