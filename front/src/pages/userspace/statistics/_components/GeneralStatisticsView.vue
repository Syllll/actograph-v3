<template>
  <div class="column q-gutter-md">
    <div v-if="statistics.sharedState.loading" class="row justify-center q-pa-lg">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="statistics.sharedState.error" class="text-negative q-pa-md">
      Erreur : {{ statistics.sharedState.error }}
    </div>

    <div v-else-if="statistics.sharedState.generalStatistics" class="column q-gutter-md">
      <DCard bgColor="background">
        <DCardSection>
          <div class="text-h6 q-mb-md">Statistiques générales</div>
          
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
          <div class="text-h6 q-mb-md">Statistiques par catégorie</div>
          
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
import { useStatistics } from 'src/composables/use-statistics';
import { DCard, DCardSection } from '@lib-improba/components';

export default defineComponent({
  name: 'GeneralStatisticsView',
  setup() {
    const statistics = useStatistics();

    const tableColumns = [
      {
        name: 'label',
        label: 'Métrique',
        field: 'label',
        align: 'left' as const,
      },
      {
        name: 'value',
        label: 'Valeur',
        field: 'value',
        align: 'right' as const,
      },
    ];

    const categoryColumns = [
      {
        name: 'categoryName',
        label: 'Catégorie',
        field: 'categoryName',
        align: 'left' as const,
      },
      {
        name: 'activeObservablesCount',
        label: 'Observables actifs',
        field: 'activeObservablesCount',
        align: 'center' as const,
      },
      {
        name: 'totalDuration',
        label: 'Durée totale',
        field: 'totalDuration',
        align: 'right' as const,
        format: (val: number) => statistics.methods.formatDuration(val),
      },
    ];

    const tableRows = computed(() => {
      const stats = statistics.sharedState.generalStatistics;
      if (!stats) {
        return [];
      }

      return [
        {
          label: 'Durée totale d\'observation',
          value: statistics.methods.formatDuration(stats.totalDuration),
        },
        {
          label: 'Durée d\'observation (sans pauses)',
          value: statistics.methods.formatDuration(stats.observationDuration),
        },
        {
          label: 'Nombre total de relevés',
          value: stats.totalReadings.toString(),
        },
        {
          label: 'Nombre de pauses',
          value: stats.pauseCount.toString(),
        },
        {
          label: 'Durée totale des pauses',
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
      statistics,
      tableColumns,
      categoryColumns,
      tableRows,
      categoryRows,
    };
  },
});
</script>

