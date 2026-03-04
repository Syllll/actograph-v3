<template>
  <DPage>
    <!-- Conteneur principal avec positionnement absolu -->
    <div class="graph-page">
      <div class="graph-header row items-center q-px-sm q-py-xs">
        <div v-if="graph.sharedState.error" class="text-negative text-caption row items-center">
          <q-icon name="warning" size="xs" class="q-mr-xs" />
          <span>{{ graph.sharedState.error }}</span>
        </div>
        <div v-else class="text-caption text-grey-6">
          {{ graph.sharedState.ready ? 'Graphique prêt' : 'En attente...' }}
        </div>
      </div>

      <!--
        ⚠️ CANVAS CONTAINER - ARCHITECTURE CRITIQUE
        
        Le canvas-container et DCanvas sont TOUJOURS dans le DOM.
        NE JAMAIS ajouter de v-if sur ce container ou DCanvas !
        
        Les états (loading, empty) sont des OVERLAYS positionnés par-dessus,
        qui peuvent être ajoutés/retirés sans affecter le canvas.
        
        Voir le commentaire dans <script> pour l'explication complète.
      -->
      <div class="canvas-container">
        <DCanvas ref="canvasRef" @ready="onCanvasReady" />
        
        <!-- Loading overlay - SUPERPOSÉ au canvas, ne le détruit pas -->
        <div v-if="graph.sharedState.loading" class="loading-overlay column items-center justify-center">
          <q-spinner-dots color="primary" size="50px" />
          <div class="text-body2 text-grey q-mt-md">Chargement du graphique...</div>
        </div>
        
        <!-- Empty state overlay -->
        <div v-if="!graph.sharedState.loading && !graph.hasData.value" class="empty-state-overlay column items-center justify-center">
          <q-icon name="mdi-chart-line" size="64px" color="grey-5" />
          <div class="text-h6 q-mt-md text-grey">Aucune donnée à afficher</div>
          <div class="text-body2 text-grey q-mt-xs">
            <span v-if="!chronicle.hasChronicle.value">Chargez une observation pour voir le graphe</span>
            <span v-else-if="!chronicle.hasReadings.value">Enregistrez des observations pour voir le graphe</span>
            <span v-else>En attente du chargement...</span>
          </div>
        </div>
      </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useGraph, useChronicle } from '@composables';
import { DPage, DCanvas } from '@components';

/**
 * Graph page component - Affiche l'actogramme avec PixiJS.
 * 
 * ⚠️ ARCHITECTURE IMPORTANTE - LIRE ATTENTIVEMENT :
 * 
 * Le composant DCanvas DOIT rester monté en permanence. Ne JAMAIS utiliser
 * v-if/v-else qui détruirait/recréerait DCanvas selon une condition.
 * 
 * POURQUOI ?
 * Quand un canvas est recréé, ses attributs width/height sont réinitialisés.
 * Modifier canvas.width ou canvas.height EFFACE tout le contenu du canvas.
 * Si DCanvas est détruit puis recréé pendant que PixiJS a dessiné,
 * le nouveau DCanvas va réappliquer les dimensions → canvas effacé → écran blanc.
 * 
 * SOLUTION :
 * - DCanvas est TOUJOURS dans le DOM (pas de v-if qui le détruit)
 * - Les états loading/empty sont des OVERLAYS positionnés par-dessus le canvas
 * - Les overlays utilisent v-if pour apparaître/disparaître SANS toucher au canvas
 * 
 * FLUX D'INITIALISATION :
 * 1. Page montée → DCanvas monté
 * 2. DCanvas.onMounted → attend dimensions → applique dimensions → emit('ready')
 * 3. onCanvasReady → appelle graph.methods.initGraph()
 * 4. initGraph → crée PixiApp → dessine le graphique
 * 
 * ⚠️ Si vous devez modifier ce composant, assurez-vous que DCanvas
 * n'est JAMAIS dans une branche v-if/v-else qui pourrait le détruire !
 */
export default defineComponent({
  name: 'GraphPage',
  components: {
    DPage,
    DCanvas,
  },
  setup() {
    const canvasRef = ref<InstanceType<typeof DCanvas> | null>(null);
    const graph = useGraph({ canvasRef });
    const chronicle = useChronicle();

    // Appelé quand DCanvas a fini de configurer les dimensions
    const onCanvasReady = async () => {
      console.log('[GraphPage] Canvas ready, initializing graph...');
      if (graph.hasData.value) {
        await graph.methods.initGraph();
      }
    };

    return {
      canvasRef,
      graph,
      chronicle,
      onCanvasReady,
    };
  },
});
</script>

<style scoped lang="scss">
.graph-page {
  position: absolute;
  inset: 0;
}

.graph-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  min-height: 48px;
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.canvas-container {
  position: absolute;
  top: 48px;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.empty-state-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.95);
  z-index: 1;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 2;
}
</style>
