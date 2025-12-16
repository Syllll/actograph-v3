<template>
  <DPage>
    <!-- 
      Conteneur principal qui sert de référence pour mesurer la largeur disponible.
      La classe "fit" permet d'occuper tout l'espace disponible.
    -->
    <div ref="containerRef" class="fit">
      <!-- 
        Splitter Quasar qui divise l'espace entre le graphe et le drawer.
        
        Configuration :
        - v-model="state.graphPercent" : Pourcentage de largeur pour le panneau "before" (graphe)
        - :limits="[10, 92]" : Limites de redimensionnement en pourcentage
          - 10% minimum pour le graphe (empêche de le réduire trop)
          - 92% maximum pour le graphe → garantit ~8% minimum pour le drawer
        
        Le splitter utilise le mode pourcentage natif de Quasar (pas unit="px")
        car les limites natives fonctionnent de manière fiable pour bloquer le drag.
      -->
      <q-splitter
        v-model="state.graphPercent"
        class="fit"
        :limits="[10, 92]"
      >
        <!-- Panneau gauche : Le graphe d'analyse -->
        <template v-slot:before>
          <Graph :drawer-width-px="drawerWidthPx" :show-drawer="true" />
        </template>

        <!-- Séparateur : Bouton draggable pour redimensionner -->
        <template v-slot:separator>
          <q-avatar
            color="accent"
            text-color="white"
            size="md"
            icon="drag_indicator"
            style="cursor: col-resize;"
          />
        </template>

        <!-- Panneau droit : Le drawer de personnalisation du graphe -->
        <template v-slot:after>
          <GraphCustomizationDrawer :drawer-width="drawerWidthPx" />
        </template>
      </q-splitter>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, ref, onMounted, onUnmounted } from 'vue';
import Graph from './_components/graph/Index.vue';
import GraphCustomizationDrawer from './_components/graph-customization-drawer/Index.vue';
import { useGraphCustomization } from './_components/graph-customization-drawer/use-graph-customization';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Largeur minimale du drawer en pixels (pour le calcul de drawerWidthPx) */
const DRAWER_MIN_WIDTH_PX = 100;

/** Pourcentage par défaut pour le drawer (30% = drawer ouvert normalement) */
const DRAWER_DEFAULT_WIDTH_PERCENT = 30;

export default defineComponent({
  components: {
    Graph,
    GraphCustomizationDrawer,
  },

  setup() {
    // ========================================================================
    // COMPOSABLES & REFS
    // ========================================================================

    /** Composable pour gérer l'état du drawer (ouvert/fermé) */
    const customization = useGraphCustomization();

    /** Référence au conteneur pour mesurer sa largeur */
    const containerRef = ref<HTMLElement | null>(null);

    // ========================================================================
    // STATE
    // ========================================================================

    const state = reactive({
      /** 
       * Pourcentage de largeur occupé par le graphe (panneau "before").
       * Le drawer occupe le reste (100 - graphPercent).
       * Valeur par défaut : 70% (donc 30% pour le drawer)
       */
      graphPercent: 100 - DRAWER_DEFAULT_WIDTH_PERCENT,

      /** 
       * Largeur du conteneur en pixels.
       * Utilisé pour calculer la largeur réelle du drawer en pixels.
       */
      containerWidth: 0,
    });

    // Ouvrir le drawer par défaut au chargement
    customization.methods.openDrawer();

    // ========================================================================
    // COMPUTED
    // ========================================================================

    /**
     * Calcule la largeur du drawer en pixels à partir du pourcentage.
     * Cette valeur est passée aux composants enfants qui en ont besoin
     * (ex: pour positionner des éléments ou adapter le layout).
     */
    const drawerWidthPx = computed(() => {
      if (state.containerWidth === 0) return DRAWER_MIN_WIDTH_PX;

      // Calculer le pourcentage du drawer (inverse du graphe)
      const drawerPercent = 100 - state.graphPercent;

      // Convertir en pixels
      const drawerWidth = (state.containerWidth * drawerPercent) / 100;

      // Garantir un minimum de 100px
      return Math.max(DRAWER_MIN_WIDTH_PX, drawerWidth);
    });

    // ========================================================================
    // FONCTIONS
    // ========================================================================

    /**
     * Met à jour la largeur du conteneur.
     * Appelée au montage et à chaque redimensionnement de la fenêtre.
     */
    const updateContainerWidth = () => {
      if (containerRef.value) {
        const width = containerRef.value.clientWidth;
        if (width > 0) {
          state.containerWidth = width;
        }
      }
    };

    // ========================================================================
    // LIFECYCLE HOOKS
    // ========================================================================

    let resizeObserver: ResizeObserver | null = null;

    onMounted(() => {
      // Mesurer la largeur initiale
      updateContainerWidth();

      // Observer les changements de taille du conteneur
      // (redimensionnement de la fenêtre, sidebar, etc.)
      resizeObserver = new ResizeObserver(() => {
        updateContainerWidth();
      });

      if (containerRef.value) {
        resizeObserver.observe(containerRef.value);
      }
    });

    onUnmounted(() => {
      // Nettoyer l'observer pour éviter les fuites de mémoire
      if (resizeObserver && containerRef.value) {
        resizeObserver.unobserve(containerRef.value);
        resizeObserver.disconnect();
      }
    });

    // ========================================================================
    // WATCHERS
    // ========================================================================

    /**
     * Synchronise la position du splitter avec l'état showDrawer.
     * Permet d'ouvrir/fermer le drawer via le bouton de personnalisation.
     */
    watch(
      () => customization.sharedState.showDrawer,
      (showDrawer) => {
        if (showDrawer) {
          // Drawer ouvert : 70% graphe, 30% drawer
          state.graphPercent = 100 - DRAWER_DEFAULT_WIDTH_PERCENT;
        } else {
          // Drawer minimisé : 92% graphe (limite max), ~8% drawer
          // Note: 92% est la limite max définie dans :limits, donc le drawer
          // ne peut pas être réduit plus que ~8%
          state.graphPercent = 92;
        }
      },
      { immediate: false }
    );

    // ========================================================================
    // RETURN
    // ========================================================================

    return {
      customization,
      state,
      containerRef,
      drawerWidthPx,
    };
  },
});
</script>
