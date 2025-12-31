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
          flat
          dense
          round
          icon="mdi-cog"
          aria-label="Paramètres"
          @click="$router.push({ name: 'settings' })"
        />
      </q-toolbar>
    </q-header>

    <!-- Page content -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Footer avec tabs -->
    <q-footer elevated class="bg-primary">
      <q-tabs
        v-model="currentTab"
        class="text-white"
        active-color="accent"
        indicator-color="accent"
        align="justify"
      >
        <q-route-tab
          name="home"
          icon="mdi-home"
          label="Accueil"
          :to="{ name: 'home' }"
        />
        <q-route-tab
          name="observation"
          icon="mdi-binoculars"
          label="Observation"
          :to="{ name: 'observation' }"
          :disable="!hasChronicle"
        />
        <q-route-tab
          name="readings"
          icon="mdi-table"
          label="Relevés"
          :to="{ name: 'readings' }"
          :disable="!hasChronicle"
        />
        <q-route-tab
          name="graph"
          icon="mdi-chart-line"
          label="Graph"
          :to="{ name: 'graph' }"
          :disable="!hasChronicle || !hasReadings"
        />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useChronicle } from '@composables/use-chronicle';

export default defineComponent({
  name: 'MainLayout',

  setup() {
    const route = useRoute();
    const chronicle = useChronicle();
    const currentTab = ref('home');

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

    return {
      currentTab,
      pageTitle,
      showBackButton,
      hasChronicle,
      hasReadings,
    };
  },
});
</script>
