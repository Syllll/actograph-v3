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
        
        IMPORTANT: Utilisation de v-show au lieu de v-if pour éviter les problèmes
        de démontage rapide avec les directives Quasar (__qtouchpan).
      -->
      <q-splitter
        v-show="observation.isChronometerMode.value || observation.sharedState.currentObservation?.videoPath"
        :key="`video-splitter-${observation.sharedState.currentObservation?.id || 'new'}`"
        v-model="state.videoSplitterModel"
        horizontal
        :style="{ height: state.containerHeight + 'px', display: (observation.isChronometerMode.value || observation.sharedState.currentObservation?.videoPath) ? 'flex' : 'none' }"
        :limits="[10, 75]"
      >
        <!-- Panneau supérieur : Lecteur vidéo -->
        <template v-slot:before>
          <div class="video-panel-wrapper column fit position-relative">
            <VideoPlayer class="col" />
            <q-btn
              icon="open_in_new"
              flat
              round
              dense
              size="sm"
              class="popout-btn"
              :title="$t('observation.popoutVideoTooltip')"
              :disable="!observation.sharedState.currentObservation?.id"
              @click="methods.popOutVideo"
            />
          </div>
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
                <div class="buttons-panel-wrapper column fit position-relative">
                  <ButtonsSideIndex class="col" />
                  <q-btn
                    icon="open_in_new"
                    flat
                    round
                    dense
                    size="sm"
                    class="popout-btn"
                    :title="$t('observation.popoutButtonsTooltip')"
                    :disable="!observation.sharedState.currentObservation?.id"
                    @click="methods.popOutButtons"
                  />
                </div>
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
      <div
        v-show="!(observation.isChronometerMode.value || observation.sharedState.currentObservation?.videoPath)"
        class="fit column no-wrap"
        :style="{ display: !(observation.isChronometerMode.value || observation.sharedState.currentObservation?.videoPath) ? 'flex' : 'none' }"
      >
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
            <div class="buttons-panel-wrapper column fit position-relative">
              <ButtonsSideIndex class="col" />
              <q-btn
                icon="open_in_new"
                flat
                round
                dense
                size="sm"
                class="popout-btn"
                :title="$t('observation.popoutButtonsTooltip')"
                :disable="!observation.sharedState.currentObservation?.id"
                @click="methods.popOutButtons"
              />
            </div>
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

    const popOutVideo = () => {
      const observationId = observation.sharedState.currentObservation?.id;
      if (!observationId) return;
      const width = 800;
      const height = 600;
      const left = window.screenX + 50;
      const top = window.screenY + 50;
      const baseUrl = window.location.href.split('#')[0];
      window.open(
        `${baseUrl}#/popup/video?observationId=${observationId}`,
        'actograph-video',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes`
      );
    };

    const popOutButtons = () => {
      const observationId = observation.sharedState.currentObservation?.id;
      if (!observationId) return;
      const width = 400;
      const height = 600;
      const left = window.screenX + 50;
      const top = window.screenY + 50;
      const baseUrl = window.location.href.split('#')[0];
      window.open(
        `${baseUrl}#/popup/buttons?observationId=${observationId}`,
        'actograph-buttons',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes`
      );
    };

    const methods = {
      popOutVideo,
      popOutButtons,
    };

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
      methods,
    };
  },
});
</script>

<style scoped>
.video-resize-handle {
  cursor: ns-resize;
}

.popout-btn {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
}
</style>

