<template>
  <DPage>
    <div v-if="!statistics.computedState.canCalculateStatistics.value" class="fit column items-center justify-center">
      <q-icon name="mdi-chart-box" size="64px" color="grey-6" class="q-mb-md" />
      <div class="text-h4 text-grey-7">{{ t('statisticsUi.emptyTitle') }}</div>
      <div class="text-body1 text-grey-6 q-mt-sm">
        {{ t('statisticsUi.emptyHint') }}
      </div>
    </div>

    <div v-else class="fit column relative-position">
      <div class="row items-center justify-between statistics-toolbar">
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

        <div class="row items-center q-gutter-sm">
          <q-btn
          flat
          dense
          no-caps
          color="grey-8"
          icon="mdi-download"
          :label="t('graphUi.exportMenuLabel')"
          :disable="statistics.sharedState.loading"
          class="q-mr-sm statistics-export-btn"
        >
          <q-menu anchor="bottom right" self="top right" :offset="[0, 8]">
            <div class="q-pa-md" style="min-width: 280px">
              <div class="text-weight-medium q-mb-sm">{{ t('graphUi.exportSectionFormat') }}</div>
              <div class="row q-gutter-sm q-mb-md">
                <q-btn
                  v-for="opt in exportFormatOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :color="exportSelection.format === opt.value ? 'primary' : 'grey-3'"
                  :text-color="exportSelection.format === opt.value ? 'white' : 'grey-9'"
                  no-caps
                  unelevated
                  class="col"
                  @click="exportSelection.format = opt.value"
                />
              </div>
              <q-btn
                color="primary"
                no-caps
                unelevated
                icon="mdi-download"
                :label="t('graphUi.exportAction')"
                class="full-width"
                v-close-popup
                @click="runExport"
              />
            </div>
          </q-menu>
        </q-btn>
        </div>
      </div>

      <q-separator />

      <q-banner
        v-if="!hasStarted"
        dense
        rounded
        class="readings-scope-warning q-ma-sm"
      >
        <template #avatar>
          <q-icon name="warning" color="warning" />
        </template>
        {{ t('statisticsUi.missingStartWarning') }}
      </q-banner>

      <q-banner
        v-if="hasReadingsAfterLastStop"
        dense
        rounded
        class="readings-scope-warning q-ma-sm"
      >
        <template #avatar>
          <q-icon name="warning" color="warning" />
        </template>
        {{ t('graphUi.readingsAfterLastStopWarning') }}
      </q-banner>

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

      <q-banner
        v-if="isStudentAccess"
        dense
        rounded
        class="student-stats-notice q-ma-sm"
      >
        <template #avatar>
          <q-icon name="mdi-school-outline" color="warning" />
        </template>
        {{ t('licenseUi.studentStatsNotice') }}
      </q-banner>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { hasReadingsAfterLastStop as detectReadingsAfterLastStop, ReadingTypeEnum } from '@actograph/core';
import { useStatistics } from 'src/composables/use-statistics';
import { useStatisticsExport } from 'src/composables/use-statistics/use-statistics-export';
import { StatisticsExportTab } from 'src/composables/use-statistics/statistics-export.utils';
import { useObservation } from 'src/composables/use-observation';
import { useLicense } from 'src/composables/use-license';
import { emitChartsRefresh } from 'src/composables/use-app-resume';
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
    const { isStudentAccess } = useLicense();

    const state = reactive({
      activeTab: 'general' as StatisticsExportTab,
    });

    const statisticsExport = useStatisticsExport(() => state.activeTab);
    const { exportSelection, exportFormatOptions, runExport } = statisticsExport;

    const loadGeneralStatisticsIfPossible = async () => {
      if (!statistics.computedState.canCalculateStatistics.value) return;
      try {
        await statistics.methods.loadGeneralStatistics();
      } catch (error) {
        console.error('Failed to load general statistics:', error);
      }
    };

    onMounted(loadGeneralStatisticsIfPossible);

    watch(
      () => observation.sharedState.currentObservation?.id,
      () => {
        void loadGeneralStatisticsIfPossible();
      },
    );

    watch(
      () => state.activeTab,
      (tab) => {
        if (tab === 'category' || tab === 'advanced') {
          emitChartsRefresh();
        }
      },
    );

    const hasReadingsAfterLastStop = computed(() =>
      detectReadingsAfterLastStop(observation.readings.sharedState.currentReadings)
    );

    // La chronique n'a jamais été démarrée (pas de repère START) : les statistiques
    // affichées se basent alors sur l'étendue des relevés bruts et peuvent être
    // trompeuses (durée quasi nulle, catégories vides), d'où cet avertissement explicite.
    const hasStarted = computed(() =>
      (observation.readings.sharedState.currentReadings || []).some(
        (r) => r.type === ReadingTypeEnum.START,
      )
    );

    return {
      t,
      statistics,
      exportSelection,
      exportFormatOptions,
      runExport,
      state,
      isStudentAccess,
      hasReadingsAfterLastStop,
      hasStarted,
    };
  },
});
</script>

<style scoped lang="scss">
.statistics-toolbar {
  flex-shrink: 0;
}

.statistics-export-btn {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.student-stats-notice {
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
  font-size: 0.85rem;
}
</style>
