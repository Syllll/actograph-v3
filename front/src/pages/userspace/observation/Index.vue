<template>
  <DPage>
    <!-- 
      Structure principale de la page Observation
      ===========================================
      
      Cette page gère deux modes d'affichage :
      1. Mode avec vidéo : Splitter horizontal pour séparer la vidéo du reste du contenu
      2. Mode sans vidéo : Affichage direct du contenu principal (boutons + relevés)
      
      Architecture des splitters :
      - Splitter horizontal (vidéo) : Sépare la vidéo (haut) du contenu principal (bas)
      - Splitter vertical (contenu) : Sépare les boutons (gauche) des relevés (droite)
      
      IMPORTANT : Le splitter horizontal nécessite une hauteur explicite en pixels pour
      fonctionner correctement. Cette hauteur est calculée dynamiquement via ResizeObserver.
    -->
    <div ref="containerRef" class="fit column no-wrap">
      <!-- 
        Mode avec vidéo : Splitter horizontal
        ---------------------------------------
        Affiché si :
        - L'observation est en mode chronomètre, OU
        - Une vidéo est chargée (videoPath existe)
        
        Le splitter horizontal permet de redimensionner la hauteur de la zone vidéo
        en glissant le séparateur. La vidéo occupe le panneau "before" et le reste
        du contenu (toolbar + boutons/relevés) occupe le panneau "after".
      -->
      <q-splitter
        v-if="observation.isChronometerMode.value || observation.sharedState.currentObservation?.videoPath"
        v-model="state.videoSplitterModel"
        horizontal
        :style="{ height: state.containerHeight + 'px' }"
        :limits="[10, 75]"
      >
        <!-- Panneau supérieur : Lecteur vidéo -->
        <template v-slot:before>
          <VideoPlayer />
        </template>
        
        <!-- Séparateur : Bouton de redimensionnement horizontal -->
        <template v-slot:separator>
          <q-avatar
            color="accent"
            text-color="white"
            size="md"
            icon="drag_indicator"
            class="video-resize-handle"
          />
        </template>
        
        <!-- Panneau inférieur : Contenu principal (toolbar + boutons/relevés) -->
        <template v-slot:after>
          <div class="fit column no-wrap">
            <!-- Toolbar calendrier (affichée uniquement en mode calendrier) -->
            <CalendarToolbar
              v-if="!observation.isChronometerMode.value"
              class="col-auto"
            />
            
            <!-- Splitter vertical : Boutons (gauche) / Relevés (droite) -->
            <q-splitter
              v-model="state.splitterModel"
              class="col"
              :limits="[20, 80]"
              reverse
            >
              <template v-slot:before>
                <ButtonsSideIndex />
              </template>
              <template v-slot:separator>
                <q-avatar
                  color="accent"
                  text-color="white"
                  size="md"
                  icon="drag_indicator"
                />
              </template>
              <template v-slot:after>
                <ReadingsSideIndex />
              </template>
            </q-splitter>
          </div>
        </template>
      </q-splitter>
      
      <!-- 
        Mode sans vidéo : Affichage direct du contenu principal
        --------------------------------------------------------
        Affiché si aucune vidéo n'est chargée et que l'observation n'est pas en mode chronomètre.
        Dans ce cas, on affiche directement la toolbar et le splitter vertical boutons/relevés.
      -->
      <template v-else>
        <!-- Toolbar calendrier -->
        <CalendarToolbar class="col-auto" />
        
        <!-- Splitter vertical : Boutons (gauche) / Relevés (droite) -->
        <q-splitter
          v-model="state.splitterModel"
          class="col"
          :limits="[20, 80]"
          reverse
        >
          <template v-slot:before>
            <ButtonsSideIndex />
          </template>
          <template v-slot:separator>
            <q-avatar
              color="accent"
              text-color="white"
              size="md"
              icon="drag_indicator"
            />
          </template>
          <template v-slot:after>
            <ReadingsSideIndex />
          </template>
        </q-splitter>
      </template>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, onMounted, onUnmounted } from 'vue';
import ButtonsSideIndex from './_components/buttons-side/Index.vue';
import ReadingsSideIndex from './_components/readings-side/Index.vue';
import CalendarToolbar from './_components/CalendarToolbar.vue';
import VideoPlayer from './_components/VideoPlayer.vue';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  components: {
    ButtonsSideIndex,
    ReadingsSideIndex,
    CalendarToolbar,
    VideoPlayer,
  },

  setup() {
    const observation = useObservation();
    const containerRef = ref<HTMLElement | null>(null);
    
    const state = reactive({
      splitterModel: 40, // Vertical splitter for buttons/relevés (percentage)
      videoSplitterModel: 25, // Horizontal splitter for video height (percentage of available height)
      // IMPORTANT: containerHeight is required for q-splitter with horizontal orientation.
      // Quasar's q-splitter needs an explicit height value (in pixels) to properly calculate
      // and resize its panes when the user drags the separator. Without this, the splitter
      // cannot determine how much space is available and will not resize correctly.
      // The ResizeObserver below dynamically updates this value when the container size changes.
      containerHeight: 600, // Default height, will be updated dynamically by ResizeObserver
    });

    // Update container height dynamically
    // This function is called by ResizeObserver whenever the container's size changes.
    // It ensures that the q-splitter always has an accurate height value to work with.
    const updateContainerHeight = () => {
      if (containerRef.value) {
        const height = containerRef.value.clientHeight;
        if (height > 0) {
          state.containerHeight = height;
        }
      }
    };

    // Set up ResizeObserver to watch for container size changes
    // IMPORTANT: This ResizeObserver is CRITICAL for the q-splitter to function correctly.
    // It watches the containerRef element and updates containerHeight whenever the size changes.
    // This allows the splitter to properly resize its panes (video player and content area)
    // when the user drags the separator handle. Without this observer, the splitter would
    // have a fixed height and would not respond correctly to window resizing or dragging.
    let resizeObserver: ResizeObserver | null = null;

    onMounted(() => {
      // Initial height calculation
      updateContainerHeight();
      
      // Create ResizeObserver to watch for size changes
      // This ensures the splitter height stays synchronized with the actual container size
      if (containerRef.value) {
        resizeObserver = new ResizeObserver(() => {
          updateContainerHeight();
        });
        resizeObserver.observe(containerRef.value);
      }

      // Also update on window resize as a fallback
      // This handles cases where ResizeObserver might not fire (e.g., browser compatibility issues)
      window.addEventListener('resize', updateContainerHeight);
    });

    onUnmounted(() => {
      // Clean up ResizeObserver to prevent memory leaks
      if (resizeObserver && containerRef.value) {
        resizeObserver.unobserve(containerRef.value);
        resizeObserver.disconnect();
      }
      // Clean up window resize listener
      window.removeEventListener('resize', updateContainerHeight);
    });

    return {
      observation,
      containerRef,
      state,
    };
  },
});
</script>

<style scoped>
.video-resize-handle {
  cursor: ns-resize;
}
</style>

