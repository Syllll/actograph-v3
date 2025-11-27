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
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-subtitle2">
                Pourcentage de temps "on" au sein de la catégorie
              </div>
              <q-toggle
                v-model="state.showPauseInPieChart"
                label="Afficher les pauses"
                dense
              />
            </div>
            <AmChartsPieChart
              :data="pieChartData"
              :colors="pieChartColors"
              :height="400"
            />
          </div>

          <!-- Bar Chart (Duration) -->
          <div>
            <div class="text-subtitle2 q-mb-sm">Durée d'état "on"</div>
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
import AmChartsPieChart from './AmChartsPieChart.vue';
import AmChartsBarChart from './AmChartsBarChart.vue';

export default defineComponent({
  name: 'CategoryStatisticsView',
  components: {
    AmChartsPieChart,
    AmChartsBarChart,
  },
  setup() {
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
      if (!stats || !stats.observables || stats.observables.length === 0) {
        console.debug('[CategoryStatisticsView] No statistics data available');
        return [];
      }

      console.debug('[CategoryStatisticsView] Statistics data:', {
        observables: stats.observables,
        totalCategoryDuration: stats.totalCategoryDuration,
        pauseDuration: stats.pauseDuration,
      });

      // Calculate total duration including pauses if needed
      // If backend didn't calculate it, calculate it from observables
      let totalCategoryDuration = stats.totalCategoryDuration || 0;
      if (totalCategoryDuration === 0) {
        // Fallback: calculate from observables if backend returned 0
        totalCategoryDuration = stats.observables.reduce(
          (sum, obs) => sum + (obs.onDuration || 0),
          0,
        );
        console.debug(
          '[CategoryStatisticsView] Calculated totalCategoryDuration from observables:',
          totalCategoryDuration,
        );
      }
      const pauseDuration = stats.pauseDuration || 0;
      const totalWithPause = totalCategoryDuration + pauseDuration;

      console.debug('[CategoryStatisticsView] Durations:', {
        totalCategoryDuration,
        pauseDuration,
        totalWithPause,
        showPauseInPieChart: state.showPauseInPieChart,
      });

      // Build data array with observables
      // Include all observables that have either duration or count > 0
      const data = stats.observables
        .filter((obs) => {
          const hasDuration = obs.onDuration > 0;
          const hasCount = obs.onCount > 0;
          const included = hasDuration || hasCount;
          
          console.debug(`[CategoryStatisticsView] Observable ${obs.observableName}:`, {
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
          // Use percentage directly from backend (relative to total observation duration)
          // The backend calculates onPercentage relative to totalDuration (observation duration minus pauses)
          let percentage = obs.onPercentage || 0;
          
          console.debug(`[CategoryStatisticsView] Mapped observable ${obs.observableName}:`, {
            originalPercentage: obs.onPercentage,
            finalPercentage: percentage,
            onDuration: obs.onDuration,
          });
          
          return {
            label: obs.observableName,
            value: Math.max(0, percentage), // Ensure non-negative
          };
        });

      // Add pause if option is enabled and there are pauses
      if (state.showPauseInPieChart && pauseDuration > 0 && totalWithPause > 0) {
        const pausePercentage = (pauseDuration / totalWithPause) * 100;
        data.push({
          label: 'Pause',
          value: pausePercentage,
        });
      }

      console.debug('[CategoryStatisticsView] Final pie chart data:', data);
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

      // If showing pauses, add grey color for pause at the end
      if (state.showPauseInPieChart && stats?.pauseDuration && stats.pauseDuration > 0) {
        return [...baseColors, '#9E9E9E']; // Grey for pause
      }

      return baseColors;
    });

    const barChartData = computed(() => {
      const stats = statistics.sharedState.categoryStatistics;
      if (!stats || !stats.observables || stats.observables.length === 0) {
        return [];
      }

      const data = stats.observables
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

