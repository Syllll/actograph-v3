<template>
  <div ref="containerRef" class="d-canvas">
    <!-- Canvas avec dimensions initiales à 0 pour forcer l'attente -->
    <canvas ref="canvasRef" :id="canvasId" width="0" height="0" />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onBeforeUnmount, ref } from 'vue';

/**
 * DCanvas - Canvas component for PixiJS in Capacitor/Mobile environment.
 * 
 * ⚠️ IMPORTANT - PIÈGES À ÉVITER :
 * 
 * 1. NE JAMAIS utiliser ResizeObserver - cela cause des boucles infinies avec PixiJS
 *    car PixiJS modifie aussi les dimensions du canvas.
 * 
 * 2. NE JAMAIS modifier canvas.width ou canvas.height APRÈS que PixiJS ait dessiné.
 *    Modifier ces attributs EFFACE TOUT le contenu du canvas (comportement standard HTML5).
 * 
 * 3. Les dimensions sont appliquées UNE SEULE FOIS au montage, puis on laisse PixiJS
 *    gérer le canvas via son option 'resizeTo' si besoin.
 * 
 * 4. Sur mobile/Capacitor, le layout peut prendre du temps à se calculer.
 *    On utilise une boucle de retry pour attendre des dimensions valides.
 * 
 * 5. Le composant parent (Index.vue) ne doit JAMAIS détruire/recréer ce composant
 *    via v-if/v-else, sinon les dimensions seront réappliquées et le canvas effacé.
 *    Utiliser des overlays avec v-if à la place.
 * 
 * Flux d'initialisation :
 * 1. onMounted → attend les dimensions du parent
 * 2. Applique les dimensions CSS et bitmap (width/height attributes)
 * 3. Émet 'ready' → Index.vue appelle useGraph.initGraph()
 * 4. PixiJS dessine dans le canvas
 */
export default defineComponent({
  props: {
    canvasId: {
      type: String,
      required: false,
    },
  },
  emits: ['ready'],
  setup(props, context) {
    const containerRef = ref<HTMLElement | null>(null);
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    
    // ⚠️ GUARD: Empêche les doubles initialisations si le composant est re-monté
    // (ne devrait pas arriver si Index.vue est bien configuré, mais sécurité supplémentaire)
    let initialized = false;
    let isMounted = true;

    onBeforeUnmount(() => {
      isMounted = false;
    });

    onMounted(async () => {
      // Protection contre les doubles initialisations
      if (initialized) {
        console.log('[DCanvas] Already initialized, skipping');
        return;
      }

      const container = containerRef.value;
      const canvas = canvasRef.value;
      if (!container || !canvas) return;

      const parent = container.parentElement;
      if (!parent) return;

      // =========================================================================
      // ÉTAPE 1: Attendre que le parent ait des dimensions valides
      // Sur Capacitor/mobile, le WebView peut mettre du temps à calculer le layout.
      // On poll pendant max 2.5 secondes (50 * 50ms).
      // =========================================================================
      let width = 0;
      let height = 0;
      
      for (let i = 0; i < 50; i++) {
        const rect = parent.getBoundingClientRect();
        width = Math.floor(rect.width);
        height = Math.floor(rect.height);
        
        if (width > 0 && height > 0) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        if (!isMounted) return;
      }

      if (width <= 0 || height <= 0) {
        console.error('[DCanvas] Failed to get valid dimensions after retries');
        return;
      }

      console.log('[DCanvas] Setting dimensions:', width, 'x', height);

      // =========================================================================
      // ÉTAPE 2: Appliquer les dimensions CSS au container
      // =========================================================================
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;

      // =========================================================================
      // ÉTAPE 3: Appliquer les dimensions BITMAP au canvas
      // ⚠️ CRITIQUE: Ces attributs (width/height) définissent la taille du bitmap
      // interne du canvas. On multiplie par devicePixelRatio pour les écrans HiDPI.
      // 
      // ⚠️ NE JAMAIS MODIFIER CES VALEURS APRÈS QUE PIXIJS AIT DESSINÉ !
      // Modifier canvas.width ou canvas.height EFFACE le contenu du canvas.
      // =========================================================================
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      console.log('[DCanvas] Canvas ready:', width, 'x', height, 'bitmap:', canvas.width, 'x', canvas.height);

      // Marquer comme initialisé AVANT d'émettre ready
      initialized = true;
      
      // =========================================================================
      // ÉTAPE 4: Signaler que le canvas est prêt
      // Index.vue écoute cet événement pour appeler useGraph.initGraph()
      // =========================================================================
      if (!isMounted) return;
      context.emit('ready');
    });

    context.expose({ canvasRef, containerRef });

    return { containerRef, canvasRef };
  },
});
</script>

<style scoped lang="scss">
.d-canvas {
  position: relative;
  overflow: hidden;
}

canvas {
  display: block;
}
</style>
