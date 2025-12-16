import { reactive } from 'vue';

/**
 * État partagé du drawer de personnalisation.
 */
const sharedState = reactive({
  showDrawer: false,
});

/**
 * Composable pour gérer l'état du drawer de personnalisation du graphe.
 * IMPORTANT: Le drawer ne peut jamais être complètement fermé, il reste toujours à 100px minimum.
 */
export const useGraphCustomization = () => {
  const methods = {
    openDrawer: () => {
      sharedState.showDrawer = true;
    },
    /**
     * "Fermer" le drawer = le réduire au minimum de 100px
     * Le drawer ne peut jamais être complètement fermé
     */
    closeDrawer: () => {
      // Réduire au minimum au lieu de fermer complètement
      sharedState.showDrawer = false; // false = mode minimisé à 100px
    },
    toggleDrawer: () => {
      // Toggle entre ouvert (30% par défaut) et minimisé (100px)
      sharedState.showDrawer = !sharedState.showDrawer;
    },
  };

  return {
    sharedState,
    methods,
  };
};
