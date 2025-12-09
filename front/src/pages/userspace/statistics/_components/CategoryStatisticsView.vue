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

          <!-- 
            AFFICHAGE CONDITIONNEL SELON LE TYPE DE CATÉGORIE
            ==================================================
            
            Les statistiques s'adaptent au type de catégorie :
            
            - Catégories continues :
              → Pie chart (camembert) : pourcentage de temps "on" pour chaque observable
              → Histogramme : nombre d'occurrences pour chaque observable
            
            - Catégories discrètes (ponctuelles) :
              → Pas de pie chart (pas de notion de durée/ pourcentage)
              → Uniquement histogramme : nombre d'occurrences pour chaque observable
            
            Cette différenciation permet d'afficher les métriques pertinentes
            selon la nature de la catégorie (continue avec durée vs discrète avec occurrences).
          -->
          
          <!-- Pie Chart (Percentage) - Uniquement pour les catégories continues -->
          <div v-if="isContinuousCategory" class="q-mb-lg">
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

          <!-- 
            HISTOGRAMME DES OCCURRENCES
            ============================
            
            Cet histogramme affiche le nombre d'occurrences (onCount) pour chaque observable,
            indépendamment du type de catégorie (continue ou discrète).
            
            Pour les catégories continues : complète le pie chart en montrant combien de fois
            chaque observable a été activé.
            
            Pour les catégories discrètes : c'est la seule visualisation pertinente car
            ces catégories n'ont pas de notion de durée, seulement des occurrences ponctuelles.
          -->
          <!-- Bar Chart (Occurrences) -->
          <div>
            <div class="text-subtitle2 q-mb-sm">Nombre d'occurrences</div>
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
import { useStatistics } from 'src/composables/use-statistics';
import { useObservation } from 'src/composables/use-observation';
import { DCard, DCardSection } from '@lib-improba/components';
import {
  ProtocolItemActionEnum,
  protocolService,
} from '@services/observations/protocol.service';
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

    /**
     * DÉTECTION DU TYPE DE CATÉGORIE (CONTINUE VS DISCRÈTE)
     * =======================================================
     * 
     * Cette fonction détermine si la catégorie sélectionnée est continue ou discrète
     * en analysant son action dans le protocole :
     * 
     * - Continue : action === 'continuous' ou action non défini (par défaut)
     * - Discrète : action === 'discrete'
     * 
     * Cette information est utilisée pour adapter l'affichage des statistiques :
     * - Continues : pie chart + histogramme
     * - Discrètes : uniquement histogramme
     */
    const isContinuousCategory = computed(() => {
      if (!state.selectedCategoryId || !observation.protocol?.sharedState?.currentProtocol) {
        return true; // Par défaut, considérer comme continue
      }
      
      const protocol = observation.protocol.sharedState.currentProtocol;
      
      // Parser les items du protocole
      const items = protocolService.parseProtocolItems(protocol);
      
      // Trouver la catégorie sélectionnée dans le protocole
      const findCategory = (items: any[]): any => {
        for (const item of items) {
          if (item.type === 'category' && item.id === state.selectedCategoryId) {
            return item;
          }
          if (item.children) {
            const found = findCategory(item.children);
            if (found) return found;
          }
        }
        return null;
      };

      const category = findCategory(items);
      if (!category) {
        return true; // Par défaut, considérer comme continue
      }

      // Une catégorie est continue si action n'est pas défini ou si action === 'continuous'
      return !category.action || category.action === ProtocolItemActionEnum.Continuous;
    });

    /**
     * HISTOGRAMME DES OCCURRENCES
     * ============================
     * 
     * Prépare les données pour l'histogramme affichant le nombre d'occurrences
     * (onCount) pour chaque observable de la catégorie.
     * 
     * Contrairement à l'ancien barChartData qui affichait la durée (onDuration),
     * cet histogramme se concentre sur le nombre de fois où chaque observable
     * a été activé, ce qui est pertinent pour les deux types de catégories :
     * 
     * - Continues : montre combien de fois chaque observable a été activé
     * - Discrètes : seule métrique pertinente (pas de durée)
     * 
     * Format des données :
     * - label : nom de l'observable
     * - value : nombre d'occurrences (onCount)
     * - formattedValue : texte formaté "X occurrence(s)"
     */
    const occurrencesBarChartData = computed(() => {
      const stats = statistics.sharedState.categoryStatistics;
      if (!stats || !stats.observables || stats.observables.length === 0) {
        return [];
      }

      const data = stats.observables
        .filter((obs) => obs.onCount > 0)
        .map((obs) => ({
          label: obs.observableName,
          value: obs.onCount || 0,
          formattedValue: `${obs.onCount} occurrence${obs.onCount > 1 ? 's' : ''}`,
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
      occurrencesBarChartData,
      barChartColors,
      isContinuousCategory,
    };
  },
});
</script>

