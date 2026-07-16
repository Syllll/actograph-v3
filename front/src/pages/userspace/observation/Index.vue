<template>
  <DPage>
    <div ref="containerRef" class="fit column no-wrap">
      <q-splitter
        v-if="hasVideo"
        :key="`video-splitter-${observation.sharedState.currentObservation?.id || 'new'}`"
        v-model="state.videoSplitterModel"
        horizontal
        :style="{ height: state.containerHeight + 'px' }"
        :limits="[10, 75]"
      >
        <template v-slot:before>
          <div class="video-panel-wrapper column fit position-relative">
            <template v-if="!popout.sharedState.video">
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
            </template>
            <div v-else class="popout-placeholder col column items-center justify-center q-pa-lg">
              <q-icon name="open_in_new" size="48px" color="grey-6" />
              <div class="text-subtitle1 q-mt-md text-grey-7">{{ $t('observation.popoutVideoActive') }}</div>
              <q-btn
                outline
                color="primary"
                :label="$t('observation.popoutBringBack')"
                @click="methods.bringBackVideo"
                class="q-mt-md"
              />
            </div>
          </div>
        </template>

        <template v-slot:separator>
          <q-avatar
            color="accent"
            text-color="white"
            size="md"
            icon="drag_indicator"
            class="video-resize-handle"
          />
        </template>

        <template v-slot:after>
          <div class="fit column no-wrap">
            <q-splitter
              v-model="state.splitterModel"
              class="col"
              :limits="[20, 80]"
              reverse
            >
              <template v-slot:before>
                <div class="buttons-panel-wrapper column fit position-relative">
                  <template v-if="!popout.sharedState.buttons">
                    <ButtonsSideIndex
                      class="col"
                      :popout-handler="methods.popOutButtons"
                    />
                  </template>
                  <div v-else class="popout-placeholder col column items-center justify-center q-pa-lg">
                    <q-icon name="open_in_new" size="48px" color="grey-6" />
                    <div class="text-subtitle1 q-mt-md text-grey-7">{{ $t('observation.popoutButtonsActive') }}</div>
                    <q-btn
                      outline
                      color="primary"
                      :label="$t('observation.popoutBringBack')"
                      @click="methods.bringBackButtons"
                      class="q-mt-md"
                    />
                  </div>
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

      <div
        v-else
        class="fit column no-wrap"
      >
        <CalendarToolbar class="col-auto" />

        <q-splitter
          v-model="state.splitterModel"
          class="col"
          :limits="[20, 80]"
          reverse
        >
          <template v-slot:before>
            <div class="buttons-panel-wrapper column fit position-relative">
              <template v-if="!popout.sharedState.buttons">
                <ButtonsSideIndex
                  class="col"
                  :popout-handler="methods.popOutButtons"
                />
              </template>
              <div v-else class="popout-placeholder col column items-center justify-center q-pa-lg">
                <q-icon name="open_in_new" size="48px" color="grey-6" />
                <div class="text-subtitle1 q-mt-md text-grey-7">{{ $t('observation.popoutButtonsActive') }}</div>
                <q-btn
                  outline
                  color="primary"
                  :label="$t('observation.popoutBringBack')"
                  @click="methods.bringBackButtons"
                  class="q-mt-md"
                />
              </div>
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
import { defineComponent, reactive, ref, computed, onMounted, onUnmounted } from 'vue';
import ButtonsSideIndex from './_components/buttons-side/Index.vue';
import ReadingsSideIndex from './_components/readings-side/Index.vue';
import CalendarToolbar from './_components/CalendarToolbar.vue';
import VideoPlayer from './_components/VideoPlayer.vue';
import { useObservation } from 'src/composables/use-observation';
import { usePopout, PopoutComponent } from 'src/composables/use-popout';

export default defineComponent({
  components: {
    ButtonsSideIndex,
    ReadingsSideIndex,
    CalendarToolbar,
    VideoPlayer,
  },

  setup() {
    const observation = useObservation();
    const popout = usePopout();
    const containerRef = ref<HTMLElement | null>(null);

    // Panneau vidéo uniquement en chronomètre avec fichier : en calendrier un
    // videoPath orphelin (import / bascule de mode) ne doit pas ouvrir une zone vide.
    const hasVideo = computed(() => {
      return observation.isChronometerMode.value
        && !!observation.sharedState.currentObservation?.videoPath;
    });

    const state = reactive({
      splitterModel: 40,
      videoSplitterModel: 25,
      containerHeight: 600,
    });

    const popoutWindows: Record<PopoutComponent, Window | null> = {
      video: null,
      buttons: null,
    };

    const openPopout = (component: PopoutComponent, width: number, height: number) => {
      const observationId = observation.sharedState.currentObservation?.id;
      if (!observationId) return;

      const left = window.screenX + 50;
      const top = window.screenY + 50;
      // On reconstruit une URL propre pour le pop-out à partir de l'origin de
      // l'app, plutôt que de réutiliser la search string héritée (qui contient
      // `targetRoute=/gateway` -> redirigerait le pop-out vers l'accueil au boot,
      // et `serverPort=undefined` en dev -> pollue l'URL). On ne conserve
      // `serverPort` que s'il s'agit d'un port réel (mode prod Electron, où l'API
      // tourne sur 127.0.0.1:serverPort). En dev, http.utils tombe sur API_URL
      // et n'a pas besoin de serverPort.
      const appUrl = new URL(window.location.href);
      const cleanUrl = new URL(appUrl.origin + appUrl.pathname);
      const serverPort = appUrl.searchParams.get('serverPort');
      if (serverPort && /^\d+$/.test(serverPort)) {
        cleanUrl.searchParams.set('serverPort', serverPort);
      }
      const baseUrl = cleanUrl.toString();
      const popup = window.open(
        `${baseUrl}#/popup/${component}?observationId=${observationId}`,
        `actograph-${component}`,
        `width=${width},height=${height},left=${left},top=${top},resizable=yes`,
      );

      if (popup) {
        popoutWindows[component] = popup;
        popout.markOpened(component);
      }
    };

    const popOutVideo = () => openPopout('video', 800, 600);
    const popOutButtons = () => openPopout('buttons', 400, 600);

    // Réintègre un panneau. La demande BroadcastChannel couvre le cas où la
    // fenêtre principale n'a plus la référence `Window` locale (refresh, reload).
    const bringBack = (component: PopoutComponent) => {
      popout.requestClose(component);

      const ref = popoutWindows[component];
      if (ref && !ref.closed) {
        try {
          ref.close();
        } catch (_) {
          /* ignore */
        }
      }

      popoutWindows[component] = null;
      popout.markClosed(component);
    };

    const methods = {
      popOutVideo,
      popOutButtons,
      bringBackVideo: () => bringBack('video'),
      bringBackButtons: () => bringBack('buttons'),
    };

    const updateContainerHeight = () => {
      if (containerRef.value) {
        const height = containerRef.value.clientHeight;
        if (height > 0) {
          state.containerHeight = height;
        }
      }
    };

    let resizeObserver: ResizeObserver | null = null;

    onMounted(() => {
      updateContainerHeight();

      if (containerRef.value) {
        resizeObserver = new ResizeObserver(() => {
          updateContainerHeight();
        });
        resizeObserver.observe(containerRef.value);
      }

      window.addEventListener('resize', updateContainerHeight);
    });

    onUnmounted(() => {
      if (resizeObserver && containerRef.value) {
        resizeObserver.unobserve(containerRef.value);
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateContainerHeight);
    });

    return {
      observation,
      popout,
      containerRef,
      hasVideo,
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

.popout-placeholder {
  background-color: var(--background, #fcfcfc);
  color: #777;
  text-align: center;
}
</style>
