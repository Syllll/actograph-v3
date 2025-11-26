<template>
  <div class="column q-gutter-md">
    <DCard bgColor="background">
      <DCardSection>
        <div class="text-h6 q-mb-md">Construction des conditions</div>
        <div class="column q-gutter-md">
          <div
            v-for="(group, groupIndex) in state.conditionGroups"
            :key="groupIndex"
            class="column q-gutter-sm q-pa-md"
            style="border: 1px solid var(--grey-4); border-radius: 4px;"
          >
            <div class="row items-center q-gutter-sm">
              <div class="text-subtitle2">Groupe {{ groupIndex + 1 }}</div>
              <q-select
                v-model="group.operator"
                :options="operatorOptions"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                dense
                outlined
                style="min-width: 100px;"
              />
              <q-space />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="methods.removeGroup(groupIndex)"
                v-if="state.conditionGroups.length > 1"
              />
            </div>

            <div
              v-for="(condition, condIndex) in group.observables"
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
                @click="methods.removeCondition(groupIndex, condIndex)"
                v-if="group.observables.length > 1"
              />
            </div>

            <q-btn
              flat
              dense
              icon="add"
              label="Ajouter une condition"
              @click="methods.addCondition(groupIndex)"
            />
          </div>

          <div class="row items-center q-gutter-sm">
            <q-select
              v-model="state.groupOperator"
              :options="operatorOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              dense
              outlined
              label="Opérateur entre groupes"
              style="min-width: 150px;"
            />
            <q-btn
              flat
              dense
              icon="add"
              label="Ajouter un groupe"
              @click="methods.addGroup"
            />
          </div>

          <div class="row items-center q-gutter-sm">
            <q-select
              v-model="state.targetCategoryId"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Catégorie cible"
              style="flex: 1;"
            />
            <q-btn
              color="primary"
              label="Calculer"
              @click="methods.calculateConditionalStatistics"
              :disable="!methods.canCalculate"
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
          <div class="text-body2 q-mb-md">
            Durée filtrée :
            {{ statistics.methods.formatDuration(statistics.sharedState.conditionalStatistics.filteredDuration) }}
          </div>

          <!-- Pie Chart -->
          <div class="q-mb-lg">
            <div class="text-subtitle2 q-mb-sm">Pourcentage d'état "on"</div>
            <PieChart
              :data="pieChartData"
              :colors="pieChartColors"
            />
          </div>

          <!-- Bar Chart -->
          <div>
            <div class="text-subtitle2 q-mb-sm">Durée d'état "on"</div>
            <BarChart
              :data="barChartData"
              :colors="barChartColors"
            />
          </div>
        </DCardSection>
      </DCard>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useStatistics } from 'src/composables/use-statistics';
import { useObservation } from 'src/composables/use-observation';
import { DCard, DCardSection } from '@lib-improba/components';
import {
  ConditionOperatorEnum,
  ObservableStateEnum,
  IConditionGroup,
} from '@services/observations/statistics.interface';
import PieChart from './PieChart.vue';
import BarChart from './BarChart.vue';

export default defineComponent({
  name: 'ConditionalStatisticsView',
  components: {
    PieChart,
    BarChart,
  },
  setup() {
    const statistics = useStatistics();
    const observation = useObservation();

    const state = reactive({
      conditionGroups: [
        {
          observables: [
            {
              observableName: '',
              state: ObservableStateEnum.ON,
            },
          ],
          operator: ConditionOperatorEnum.AND,
        },
      ] as IConditionGroup[],
      groupOperator: ConditionOperatorEnum.AND,
      targetCategoryId: null as string | null,
    });

    const operatorOptions = [
      { label: 'ET', value: ConditionOperatorEnum.AND },
      { label: 'OU', value: ConditionOperatorEnum.OR },
    ];

    const stateOptions = [
      { label: 'On', value: ObservableStateEnum.ON },
      { label: 'Off', value: ObservableStateEnum.OFF },
    ];

    const observableOptions = computed(() => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) {
        return [];
      }

      const observables: Array<{ label: string; value: string }> = [];
      for (const item of protocol._items) {
        if (item.type === 'category' && item.children) {
          for (const child of item.children) {
            if (child.type === 'observable' && child.name) {
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

    const categoryOptions = computed(() => {
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
      addGroup: () => {
        state.conditionGroups.push({
          observables: [
            {
              observableName: '',
              state: ObservableStateEnum.ON,
            },
          ],
          operator: ConditionOperatorEnum.AND,
        });
      },

      removeGroup: (index: number) => {
        state.conditionGroups.splice(index, 1);
      },

      addCondition: (groupIndex: number) => {
        state.conditionGroups[groupIndex].observables.push({
          observableName: '',
          state: ObservableStateEnum.ON,
        });
      },

      removeCondition: (groupIndex: number, condIndex: number) => {
        state.conditionGroups[groupIndex].observables.splice(condIndex, 1);
      },

      get canCalculate(): boolean {
        if (!state.targetCategoryId) {
          return false;
        }

        for (const group of state.conditionGroups) {
          if (group.observables.length === 0) {
            return false;
          }
          for (const condition of group.observables) {
            if (!condition.observableName) {
              return false;
            }
          }
        }

        return true;
      },

      calculateConditionalStatistics: async () => {
        if (!methods.canCalculate || !state.targetCategoryId) {
          return;
        }

        try {
          await statistics.methods.loadConditionalStatistics({
            conditionGroups: state.conditionGroups,
            groupOperator: state.groupOperator,
            targetCategoryId: state.targetCategoryId,
          });
        } catch (error) {
          console.error('Failed to calculate conditional statistics:', error);
        }
      },
    };

    const pieChartData = computed(() => {
      const stats = statistics.sharedState.conditionalStatistics;
      if (!stats) {
        return [];
      }

      return stats.targetCategory.observables.map((obs) => ({
        label: obs.observableName,
        value: obs.onPercentage,
      }));
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
      if (!stats) {
        return [];
      }

      return stats.targetCategory.observables.map((obs) => ({
        label: obs.observableName,
        value: obs.onDuration,
        formattedValue: statistics.methods.formatDuration(obs.onDuration),
      }));
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

