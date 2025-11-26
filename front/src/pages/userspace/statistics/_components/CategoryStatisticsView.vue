<template>
  <div class="column q-gutter-md">
    <DCard bgColor="background">
      <DCardSection>
        <div class="text-h6 q-mb-md">Sélectionner une catégorie</div>
        <q-select
          v-model="state.selectedCategoryId"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
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
            Statistiques : {{ statistics.sharedState.categoryStatistics.categoryName }}
          </div>

          <!-- Pie Chart (Percentage) -->
          <div class="q-mb-lg">
            <div class="text-subtitle2 q-mb-sm">Pourcentage d'état "on"</div>
            <PieChart
              :data="pieChartData"
              :colors="pieChartColors"
            />
          </div>

          <!-- Bar Chart (Duration) -->
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
import { defineComponent, reactive, computed, watch } from 'vue';
import { useStatistics } from 'src/composables/use-statistics';
import { useObservation } from 'src/composables/use-observation';
import { DCard, DCardSection } from '@lib-improba/components';
import PieChart from './PieChart.vue';
import BarChart from './BarChart.vue';

export default defineComponent({
  name: 'CategoryStatisticsView',
  components: {
    PieChart,
    BarChart,
  },
  setup() {
    const statistics = useStatistics();
    const observation = useObservation();

    const state = reactive({
      selectedCategoryId: null as string | null,
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

    // Auto-select first category if available
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
      if (!stats) {
        return [];
      }

      return stats.observables.map((obs) => ({
        label: obs.observableName,
        value: obs.onPercentage,
      }));
    });

    const pieChartColors = computed(() => {
      // Generate colors for pie chart
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
      const stats = statistics.sharedState.categoryStatistics;
      if (!stats) {
        return [];
      }

      return stats.observables.map((obs) => ({
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

