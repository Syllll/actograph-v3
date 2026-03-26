<template>
  <DPage>
    <div v-if="!statistics.computedState.canCalculateStatistics.value" class="fit column items-center justify-center">
      <q-icon name="mdi-chart-box" size="64px" color="grey-6" class="q-mb-md" />
      <div class="text-h4 text-grey-7">{{ t('statisticsUi.emptyTitle') }}</div>
      <div class="text-body1 text-grey-6 q-mt-sm">
        {{ t('statisticsUi.emptyHint') }}
      </div>
    </div>

    <div v-else class="fit column">
      <q-tabs
        v-model="state.activeTab"
        dense
        class="text-grey-7"
        active-color="primary"
        indicator-color="primary"
        align="left"
      >
        <q-tab name="general" :label="t('statisticsUi.tabGeneral')" />
        <q-tab name="category" :label="t('statisticsUi.tabByCategory')" />
        <q-tab name="advanced" :label="t('statisticsUi.tabAdvanced')" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="state.activeTab" animated class="col">
        <!-- Vue globale -->
        <q-tab-panel name="general" class="q-pa-md">
          <GeneralStatisticsView />
        </q-tab-panel>

        <!-- Par catégorie -->
        <q-tab-panel name="category" class="q-pa-md">
          <CategoryStatisticsView />
        </q-tab-panel>

        <!-- Mode avancé -->
        <q-tab-panel name="advanced" class="q-pa-md">
          <ConditionalStatisticsView />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatistics } from 'src/composables/use-statistics';
import { useObservation } from 'src/composables/use-observation';
import { DPage } from '@lib-improba/components';
import GeneralStatisticsView from './_components/GeneralStatisticsView.vue';
import CategoryStatisticsView from './_components/CategoryStatisticsView.vue';
import ConditionalStatisticsView from './_components/ConditionalStatisticsView.vue';

export default defineComponent({
  name: 'StatisticsPage',
  components: {
    GeneralStatisticsView,
    CategoryStatisticsView,
    ConditionalStatisticsView,
  },
  setup() {
    const { t } = useI18n();
    const statistics = useStatistics();
    const observation = useObservation();

    const state = reactive({
      activeTab: 'general',
    });

    onMounted(async () => {
      // Load general statistics on mount
      if (statistics.computedState.canCalculateStatistics.value) {
        try {
          await statistics.methods.loadGeneralStatistics();
        } catch (error) {
          console.error('Failed to load general statistics:', error);
        }
      }
    });

    return {
      t,
      statistics,
      observation,
      state,
    };
  },
});
</script>
