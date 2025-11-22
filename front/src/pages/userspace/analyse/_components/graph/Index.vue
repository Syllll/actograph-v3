<template>
  <!-- 
    Conteneur principal du graphique d'activité.
    Utilise la classe "fit" pour occuper tout l'espace disponible.
  -->
  <div class="fit">
    <!-- 
      Composant canvas personnalisé qui sera utilisé par PixiJS pour le rendu.
      Le canvas est référencé pour être passé à PixiApp lors de l'initialisation.
    -->
    <d-canvas class="fit" ref="canvasRef" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { useGraph } from './use-graph';

/**
 * Composant principal du graphique d'activité.
 * 
 * Ce composant affiche un graphique temporel des données d'observation en utilisant PixiJS.
 * Le graphique visualise :
 * - Les observables du protocole sur l'axe Y (vertical)
 * - Le temps sur l'axe X (horizontal)
 * - Les readings comme des segments ou marqueurs sur le graphique
 * 
 * Le composant délègue toute la logique de rendu au composable use-graph qui gère
 * l'initialisation et le cycle de vie de l'application PixiJS.
 */
export default defineComponent({
  setup() {
    // Référence au canvas HTML qui sera utilisé par PixiJS pour le rendu WebGL
    const canvasRef = ref<HTMLCanvasElement | null>(null);

    // Initialisation du composable graphique qui gère toute la logique PixiJS
    // Le composable reçoit la référence au canvas pour l'initialisation
    const graph = useGraph({
      init: {
        canvasRef,
      },
    });

    return {
      graph,
      canvasRef,
    };
  },
});
</script>