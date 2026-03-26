<template>
  <div class="my-observations fit column">
    <q-scroll-area class="col">
      <q-list dense separator>
        <q-item
          v-for="obs in state.recentObservations"
          :key="obs.id"
          clickable
          v-ripple
          @click="methods.loadObservation(obs.id)"
          :active="methods.isActive(obs.id)"
          active-class="active-item"
          class="observation-item"
        >
          <q-item-section>
            <q-item-label :class="{ 'text-weight-bold': methods.isActive(obs.id) }">
              {{ obs.name }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label caption>{{ methods.formatDate(obs.updatedAt) }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="!state.loading && state.recentObservations.length === 0">
          <q-item-section class="text-grey-6 text-center q-pa-md">
            Aucune chronique
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>

    <div class="col-auto q-pa-sm">
      <div class="row items-center justify-between">
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          :label="viewAllLabel"
          icon="mdi-magnify"
          @click="methods.openAllChronicles"
          class="text-body2"
        />
        <div class="text-caption text-grey-6">
          {{ state.totalCount }} au total
        </div>
      </div>
    </div>

    <AllChroniclesDialog
      v-model="state.showAllDialog"
      @selected="methods.onChronicleSelected"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { observationService } from '@services/observations/index.service';
import { IObservation } from '@services/observations/interface';
import { useObservation } from 'src/composables/use-observation';
import { relativeDay } from '@lib-improba/utils/date-format.utils';
import AllChroniclesDialog from './AllChroniclesDialog.vue';

const MAX_RECENT_ITEMS = 8;

export default defineComponent({
  name: 'MyObservations',
  components: {
    AllChroniclesDialog,
  },
  setup() {
    const $q = useQuasar();
    const observation = useObservation();

    const state = reactive({
      recentObservations: [] as IObservation[],
      totalCount: 0,
      loading: false,
      showAllDialog: false,
    });

    const viewAllLabel = computed(() => {
      if (state.totalCount > MAX_RECENT_ITEMS) {
        return `Voir toutes les chroniques (${state.totalCount})`;
      }
      return 'Rechercher une chronique';
    });

    const methods = {
      async fetchRecent() {
        state.loading = true;
        try {
          const response = await observationService.findWithPagination({
            limit: MAX_RECENT_ITEMS,
            offset: 0,
            orderBy: 'updatedAt',
            order: 'DESC',
          });
          state.recentObservations = response.results;
          state.totalCount = response.count;
        } catch (error) {
          console.error('Error fetching recent observations:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors du chargement des chroniques',
          });
          state.recentObservations = [];
          state.totalCount = 0;
        } finally {
          state.loading = false;
        }
      },

      async loadObservation(id: number) {
        await observation.methods.loadObservation(id);
      },

      openAllChronicles() {
        state.showAllDialog = true;
      },

      async onChronicleSelected(id: number) {
        state.showAllDialog = false;
        await observation.methods.loadObservation(id);
      },

      isActive(id: number): boolean {
        return observation.sharedState.currentObservation?.id === id;
      },

      formatDate(val: string): string {
        return relativeDay(val);
      },
    };

    onMounted(() => {
      methods.fetchRecent();
    });

    watch(
      () => observation.sharedState.loading,
      (newVal) => {
        if (!newVal) {
          methods.fetchRecent();
        }
      }
    );

    return {
      state,
      viewAllLabel,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.my-observations {
  .observation-item {
    border-radius: 0.25rem;
    transition: background 0.15s ease;
    min-height: 40px;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .active-item {
    background: rgba(31, 41, 55, 0.08);
  }
}
</style>
