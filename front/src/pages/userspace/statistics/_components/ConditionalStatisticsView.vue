<template>
  <div class="column q-gutter-md">
    <DCard bgColor="background">
      <DCardSection>
        <div class="text-h6 q-mb-md">Statistiques conditionnelles</div>
        <div class="column q-gutter-md">
          <!-- Étape 1: Sélection de la catégorie à étudier -->
          <div class="column q-gutter-sm">
            <div class="text-subtitle2">1. Choisir la catégorie à étudier</div>
            <q-select
              v-model="state.targetCategoryId"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              placeholder="Sélectionner une catégorie"
              style="flex: 1;"
            />
          </div>

          <!-- Étape 2: Ajout de conditions -->
          <div v-if="state.targetCategoryId" class="column q-gutter-sm">
            <div class="text-subtitle2">2. Ajouter des conditions (optionnel)</div>
            <div class="text-body2 text-grey-7 q-mb-sm">
              Les statistiques seront calculées uniquement lorsque les conditions sont valides
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
                placeholder="Observable"
                style="flex: 1;"
              />
              <div class="text-body2">est</div>
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
              label="Ajouter une condition"
              @click="methods.addCondition"
              color="primary"
            />
          </div>

          <!-- Bouton de calcul -->
          <div class="row items-center justify-end q-mt-md">
            <q-btn
              color="primary"
              label="Calculer les statistiques"
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
            Résultats pour la catégorie :
            {{ statistics.sharedState.conditionalStatistics.targetCategory.categoryName }}
          </div>
          <div v-if="state.conditions.length > 0" class="text-body2 q-mb-md">
            <div>Durée totale lorsque les conditions sont valides :</div>
            <div class="text-h6 text-primary">
              {{ statistics.methods.formatDuration(statistics.sharedState.conditionalStatistics.filteredDuration) }}
            </div>
          </div>

          <!-- Pie Chart -->
          <div class="q-mb-lg">
            <div class="text-subtitle2 q-mb-sm">
              Répartition (%) des temps "on" des observables
            </div>
            <AmChartsPieChart
              :data="pieChartData"
              :colors="pieChartColors"
              :height="400"
            />
          </div>

          <!-- Bar Chart -->
          <div>
            <div class="text-subtitle2 q-mb-sm">Durées absolues d'état "on"</div>
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
import { useStatistics } from 'src/composables/use-statistics';
import { useObservation } from 'src/composables/use-observation';
import { DCard, DCardSection } from '@lib-improba/components';
import {
  ConditionOperatorEnum,
  ObservableStateEnum,
  IConditionGroup,
  IObservableCondition,
} from '@services/observations/statistics.interface';
import AmChartsPieChart from './AmChartsPieChart.vue';
import AmChartsBarChart from './AmChartsBarChart.vue';

export default defineComponent({
  name: 'ConditionalStatisticsView',
  components: {
    AmChartsPieChart,
    AmChartsBarChart,
  },
  setup() {
    const statistics = useStatistics();
    const observation = useObservation();

    const state = reactive({
      targetCategoryId: null as string | null,
      conditions: [] as IObservableCondition[],
    });

    const operatorOptions = [
      { label: 'ET', value: ConditionOperatorEnum.AND },
      { label: 'OU', value: ConditionOperatorEnum.OR },
    ];

    const stateOptions = [
      { label: 'On', value: ObservableStateEnum.ON },
      { label: 'Off', value: ObservableStateEnum.OFF },
    ];

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

    const pieChartData = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      if (!stats || !stats.targetCategory || !stats.targetCategory.observables) {
        console.debug('[ConditionalStatisticsView] No statistics data available');
        return [];
      }

      console.debug('[ConditionalStatisticsView] Statistics data:', {
        observables: stats.targetCategory.observables,
        totalCategoryDuration: stats.targetCategory.totalCategoryDuration,
        pauseDuration: stats.targetCategory.pauseDuration,
      });

      // Calculate total duration from observables (same logic as CategoryStatisticsView)
      let totalCategoryDuration = stats.targetCategory.totalCategoryDuration || 0;
      if (totalCategoryDuration === 0) {
        // Fallback: calculate from observables if backend returned 0
        totalCategoryDuration = stats.targetCategory.observables.reduce(
          (sum, obs) => sum + (obs.onDuration || 0),
          0,
        );
        console.debug(
          '[ConditionalStatisticsView] Calculated totalCategoryDuration from observables:',
          totalCategoryDuration,
        );
      }

      console.debug('[ConditionalStatisticsView] Durations:', {
        totalCategoryDuration,
      });

      // Build data array with observables
      // Include all observables that have either duration or count > 0 (same as CategoryStatisticsView)
      const data = stats.targetCategory.observables
        .filter((obs) => {
          const hasDuration = obs.onDuration > 0;
          const hasCount = obs.onCount > 0;
          const included = hasDuration || hasCount;
          
          console.debug(`[ConditionalStatisticsView] Observable ${obs.observableName}:`, {
            onDuration: obs.onDuration,
            onPercentage: obs.onPercentage,
            onCount: obs.onCount,
            hasDuration,
            hasCount,
            included,
          });
          
          return included;
        })
        .map((obs) => {
          let percentage = obs.onPercentage || 0;
          
          // Recalculate percentage if needed (same logic as CategoryStatisticsView)
          if (totalCategoryDuration > 0 && percentage === 0 && obs.onDuration > 0) {
            percentage = (obs.onDuration / totalCategoryDuration) * 100;
          }
          
          console.debug(`[ConditionalStatisticsView] Mapped observable ${obs.observableName}:`, {
            originalPercentage: obs.onPercentage,
            calculatedPercentage: totalCategoryDuration > 0 ? (obs.onDuration / totalCategoryDuration) * 100 : 0,
            finalPercentage: percentage,
            onDuration: obs.onDuration,
            totalCategoryDuration,
          });
          
          return {
            label: obs.observableName,
            value: Math.max(0, percentage), // Ensure non-negative (same as CategoryStatisticsView)
          };
        });

      console.debug('[ConditionalStatisticsView] Final pie chart data:', data);
      return data.length > 0 ? data : [];
    });

    const pieChartColors = computed(() => {
      const colors = [
        '#1976D2',
        '#388E3C',
        '#F57C00',
        '#7B1FA2',
        '#C2185B',
        '#00796B',
        '#0288D1',
        '#5D4037',
      ];
      return colors;
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
      return '#1976D2';
    });

    return {
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

