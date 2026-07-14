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
              v-if="state.conditions.length > 1"
              class="row items-center q-gutter-sm"
            >
              <div class="text-body2">{{ t('statisticsUi.conditionOperatorLabel') }}</div>
              <q-select
                v-model="state.conditionOperator"
                :options="operatorOptions"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                outlined
                dense
                style="min-width: 120px;"
              />
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
      <q-banner
        v-if="hasNoMatchingConditions"
        dense
        rounded
        class="readings-scope-warning"
      >
        <template #avatar>
          <q-icon name="warning" color="warning" />
        </template>
        {{ t('statisticsUi.conditionalNoMatchWarning') }}
      </q-banner>

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

          <div v-if="isContinuousCategory" class="q-mb-lg">
            <div class="text-subtitle2 q-mb-sm">
              {{ pieShareTitleText }}
            </div>
            <AmChartsPieChart
              :data="pieChartData"
              :colors="pieChartColors"
              :height="400"
            />
          </div>

          <div>
            <div class="text-subtitle2 q-mb-sm">{{ barChartTitleText }}</div>
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
import {
  ProtocolItemActionEnum,
  protocolService,
} from '@services/observations/protocol.service';
import {
  resolveCategoryGraphColor,
  resolveObservableChartColor,
} from '@services/observations/protocol-graph-preferences.utils';
import {
  buildCategoryPieChartColors,
  buildCategoryPieChartData,
  calculateUnaccountedPieDuration,
} from 'src/composables/use-statistics/category-pie-chart.utils';
import AmChartsPieChart from './AmChartsPieChart.vue';
import AmChartsBarChart from './AmChartsBarChart.vue';

function formatOccurrenceCount(
  t: (key: string, values?: Record<string, unknown>) => string,
  n: number,
) {
  return n === 1
    ? t('statisticsUi.occurrenceCountOne', { count: n })
    : t('statisticsUi.occurrenceCountOther', { count: n });
}

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
      conditionOperator: ConditionOperatorEnum.AND as ConditionOperatorEnum,
    });

    const operatorOptions = computed(() => [
      { label: t('statisticsUi.operatorAnd'), value: ConditionOperatorEnum.AND },
      { label: t('statisticsUi.operatorOr'), value: ConditionOperatorEnum.OR },
    ]);

    const stateOptions = computed(() => [
      { label: t('statisticsUi.stateOn'), value: ObservableStateEnum.ON },
      { label: t('statisticsUi.stateOff'), value: ObservableStateEnum.OFF },
    ]);

    const observableOptions = computed(() => {
      if (!observation.protocol || !observation.protocol.sharedState) {
        return [];
      }
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) {
        return [];
      }

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

    const isContinuousCategory = computed(() => {
      if (!state.targetCategoryId || !observation.protocol?.sharedState?.currentProtocol) {
        return true;
      }

      const protocol = observation.protocol.sharedState.currentProtocol;
      const items = protocolService.parseProtocolItems(protocol);

      const findCategory = (nodes: unknown[]): unknown => {
        for (const item of nodes) {
          const node = item as { type?: string; id?: string; children?: unknown[] };
          if (node.type === 'category' && node.id === state.targetCategoryId) {
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

    const hasNoMatchingConditions = computed(() => {
      if (state.conditions.length === 0) {
        return false;
      }

      return (statistics.sharedState.conditionalStatistics?.filteredDuration || 0) === 0;
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
          const conditionGroups: IConditionGroup[] = state.conditions.length > 0
            ? [
                {
                  observables: state.conditions,
                  operator: state.conditionOperator,
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

    const pieShareTitleText = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      const categoryName = stats?.targetCategory?.categoryName || '';
      const conditionSummary = state.conditions
        .filter((condition) => condition.observableName)
        .map((condition) => {
          const stateLabel =
            condition.state === ObservableStateEnum.ON
              ? t('statisticsUi.stateOn')
              : t('statisticsUi.stateOff');
          return `${condition.observableName} ${t('statisticsUi.conditionIs')} ${stateLabel}`;
        })
        .join(', ');

      return conditionSummary
        ? t('statisticsUi.pieShareTitle', {
            conditions: conditionSummary,
            category: categoryName,
          })
        : t('statisticsUi.pieShareTitleNoObservable', { category: categoryName });
    });

    const barChartTitleText = computed(() =>
      isContinuousCategory.value
        ? t('statisticsUi.barOnDurationTitle')
        : t('statisticsUi.categoryOccurrencesChartTitle'),
    );

    const unaccountedPieDuration = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      return stats?.targetCategory
        ? calculateUnaccountedPieDuration(
            stats.targetCategory,
            statistics.sharedState.treatPausesAsSeparateState,
          )
        : 0;
    });

    const pieChartData = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      if (!stats || !stats.targetCategory || !stats.targetCategory.observables) {
        return [];
      }

      return buildCategoryPieChartData(stats.targetCategory, {
        treatPausesAsSeparateState: statistics.sharedState.treatPausesAsSeparateState,
        pauseSegmentLabel: t('statisticsUi.pauseSegmentLabel'),
        unaccountedSegmentLabel: t('statisticsUi.unaccountedSegmentLabel'),
        formatDuration: statistics.methods.formatDuration,
      });
    });

    const pieChartColors = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      const protocol = observation.protocol?.sharedState?.currentProtocol;
      const categoryId = state.targetCategoryId ?? '';
      const observables =
        stats?.targetCategory?.observables?.filter(
          (obs) => obs.onDuration > 0 || obs.onCount > 0,
        ) || [];
      const resolvedColors = observables.map((obs) =>
        resolveObservableChartColor(obs.observableId, categoryId, protocol),
      );

      return buildCategoryPieChartColors(
        statistics.sharedState.treatPausesAsSeparateState,
        stats?.targetCategory?.pauseDuration || 0,
        resolvedColors,
        unaccountedPieDuration.value > 0,
      );
    });

    const barChartData = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      if (!stats || !stats.targetCategory || !stats.targetCategory.observables) {
        return [];
      }

      if (!isContinuousCategory.value) {
        const data = stats.targetCategory.observables
          .filter((obs) => obs.onCount > 0)
          .map((obs) => ({
            label: obs.observableName,
            value: obs.onCount || 0,
            formattedValue: formatOccurrenceCount(t, obs.onCount || 0),
          }));

        return data.length > 0 ? data : [];
      }

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
      return resolveCategoryGraphColor(
        state.targetCategoryId,
        observation.protocol?.sharedState?.currentProtocol,
      );
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
      pieShareTitleText,
      barChartTitleText,
      pieChartData,
      pieChartColors,
      barChartData,
      barChartColors,
      isContinuousCategory,
      hasNoMatchingConditions,
    };
  },
});
</script>

<style scoped lang="scss">
.readings-scope-warning {
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
}
</style>
