<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          v-if="showBackButton"
          flat
          dense
          round
          icon="mdi-arrow-left"
          aria-label="Retour"
          @click="$router.back()"
        />

        <q-toolbar-title>
          {{ pageTitle }}
        </q-toolbar-title>

        <q-btn
          v-if="!showBackButton"
          flat
          dense
          round
          icon="mdi-cog"
          aria-label="Paramètres"
          @click="$router.push({ name: 'settings' })"
        />
      </q-toolbar>
      <div v-if="hasChronicle" class="chronicle-context row items-center no-wrap q-px-md q-pb-xs">
        <span class="ellipsis col">{{ chronicle.sharedState.currentChronicle?.name }}</span>
        <span v-if="chronicle.sharedState.isPlaying || chronicle.sharedState.isPaused" class="q-ml-sm text-warning">
          {{ chronicle.sharedState.isPaused ? 'En pause' : '● Enregistrement' }}
        </span>
      </div>
    </q-header>

    <!-- Page content -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Footer avec tabs -->
    <q-footer elevated class="bg-primary">
      <q-tabs
        v-model="currentTab"
        class="text-white main-tabs"
        active-color="accent"
        indicator-color="accent"
        align="justify"
        narrow-indicator
      >
        <q-route-tab
          exact
          name="home"
          icon="mdi-home"
          label="Accueil"
          :to="{ name: 'home' }"
        />
        <q-route-tab
          exact
          name="observation"
          icon="mdi-binoculars"
          label="Observer"
          :to="{ name: 'observation' }"
          :class="{ 'tab-locked': methods.isTabLocked('observation') }"
          :tabindex="methods.isTabLocked('observation') ? -1 : 0"
          @click="(e) => methods.guardTab(e, 'observation')"
        />
        <q-route-tab
          exact
          name="readings"
          icon="mdi-table"
          label="Relevés"
          :to="{ name: 'readings' }"
          :class="{ 'tab-locked': methods.isTabLocked('readings') }"
          :tabindex="methods.isTabLocked('readings') ? -1 : 0"
          @click="(e) => methods.guardTab(e, 'readings')"
        />
        <q-route-tab
          exact
          name="graph"
          icon="mdi-chart-line"
          label="Graphe"
          :to="{ name: 'graph' }"
          :class="{ 'tab-locked': methods.isTabLocked('graph') }"
          :tabindex="methods.isTabLocked('graph') ? -1 : 0"
          @click="(e) => methods.guardTab(e, 'graph')"
        />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useChronicle } from '@composables/use-chronicle';

const TAB_ROUTE_NAMES = new Set(['home', 'observation', 'readings', 'graph']);

export default defineComponent({
  name: 'MainLayout',

  setup() {
    const route = useRoute();
    const $q = useQuasar();
    const chronicle = useChronicle();
    const currentTab = ref<string | null>(null);

    watch(
      () => route.name,
      (name) => {
        if (typeof name === 'string' && TAB_ROUTE_NAMES.has(name)) {
          currentTab.value = name;
        } else {
          currentTab.value = null;
        }
      },
      { immediate: true }
    );

    const pageTitle = computed(() => {
      const titles: Record<string, string> = {
        home: 'ActoGraph',
        observation: 'Observation',
        readings: 'Relevés',
        graph: 'Graphe d\'activité',
        settings: 'Paramètres',
      };
      return titles[route.name as string] || 'ActoGraph';
    });

    const showBackButton = computed(() => {
      return route.name === 'settings';
    });

    const hasChronicle = computed(() => !!chronicle.sharedState.currentChronicle);
    const hasReadings = computed(() => chronicle.sharedState.currentReadings.length > 0);

    const methods = {
      isTabLocked: (tab: 'observation' | 'readings' | 'graph') => {
        if (!hasChronicle.value) return true;
        if (tab === 'graph') return !hasReadings.value;
        return false;
      },

      /**
       * Bloque la navigation des onglets verrouillés et affiche un message explicite.
       * On n'utilise pas `disable` sur QRouteTab : Quasar avale le clic sans feedback.
       * `preventDefault()` sur l'événement natif empêche ensuite `router.push()` (cf. use-tab.js).
       */
      guardTab: (event: Event, tab: 'observation' | 'readings' | 'graph') => {
        if (!hasChronicle.value) {
          event.preventDefault();
          $q.notify({
            type: 'warning',
            message: 'Chargez une chronique depuis l\'accueil',
            position: 'top',
            timeout: 2500,
          });
          return;
        }

        if (tab === 'graph' && !hasReadings.value) {
          event.preventDefault();
          $q.notify({
            type: 'info',
            message: 'Enregistrez des relevés avant d\'ouvrir le graphe',
            position: 'top',
            timeout: 2500,
          });
        }
      },
    };

    return {
      currentTab,
      chronicle,
      pageTitle,
      showBackButton,
      hasChronicle,
      hasReadings,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.chronicle-context { font-size: 12px; }

// Reduce horizontal padding so 4 labels fit comfortably on ~360dp screens.
.main-tabs {
  :deep(.q-tab) {
    padding: 4px 6px;
    font-size: 11px;
    min-height: 56px;
  }

  :deep(.q-tab__icon) {
    font-size: 22px;
  }

  :deep(.q-tab__label) {
    line-height: 1.1;
  }

  :deep(.q-tab.tab-locked) {
    opacity: 0.45;
  }
}
</style>
