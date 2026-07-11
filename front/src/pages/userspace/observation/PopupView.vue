<template>
  <div class="popup-view-root position-relative">
    <div v-if="state.loading" class="fit column items-center justify-center">
      <q-spinner color="primary" size="48px" />
      <div class="text-body2 q-mt-md text-grey">{{ $t('observation.popupLoading') }}</div>
    </div>
    <div v-else-if="state.error" class="fit column items-center justify-center">
      <q-icon name="error" size="48px" color="negative" />
      <div class="text-body1 q-mt-md text-negative">{{ state.error }}</div>
    </div>
    <template v-else>
      <VideoPlayer v-if="componentName === 'video'" />
      <ButtonsSideIndex v-else-if="componentName === 'buttons'" />
      <div v-else class="fit column items-center justify-center">
        <q-icon name="error" size="48px" color="negative" />
        <div class="text-body1 q-mt-md">{{ $t('observation.popupComponentNotFound') }}</div>
      </div>

      <div
        v-if="popoutComponent && !state.hydrated"
        class="popup-hydration-overlay column items-center justify-center"
      >
        <q-spinner color="primary" size="40px" />
        <div class="text-body2 q-mt-md text-grey-7">
          {{ $t('observation.popupLoading') }}
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import VideoPlayer from './_components/VideoPlayer.vue';
import ButtonsSideIndex from './_components/buttons-side/Index.vue';
import { useObservation } from 'src/composables/use-observation';
import { usePopout, PopoutComponent } from 'src/composables/use-popout';
import { useWindowSync } from 'src/composables/use-window-sync';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: 'PopupView',

  components: {
    VideoPlayer,
    ButtonsSideIndex,
  },

  props: {
    component: {
      type: String,
      default: '',
    },
  },

  setup(props) {
    const route = useRoute();
    const { t } = useI18n();
    const observation = useObservation();
    const popout = usePopout();
    const windowSync = useWindowSync();
    const componentName = computed(() => props.component || '');

    const state = reactive({
      loading: false,
      hydrated: false,
      error: '' as string,
    });

    // Composant incrusté (vidéo / boutons) si reconnu.
    const popoutComponent: PopoutComponent | null =
      props.component === 'video' || props.component === 'buttons'
        ? props.component
        : null;

    let heartbeatTimer: number | null = null;
    let hydrationTimeout: number | null = null;
    let lifecycleSignaled = false;
    const unsubscribers: Array<() => void> = [];

    const clearHydrationTimeout = () => {
      if (hydrationTimeout !== null) {
        clearTimeout(hydrationTimeout);
        hydrationTimeout = null;
      }
    };

    // Signale la fermeture de la fenêtre pop-out pour réintégrer le panneau
    // dans la fenêtre principale (appelé sur unmount ET beforeunload).
    const signalClosed = () => {
      if (lifecycleSignaled || !popoutComponent) return;
      lifecycleSignaled = true;
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      clearHydrationTimeout();
      popout.markClosed(popoutComponent);
    };

    const handleBeforeUnload = () => signalClosed();

    onMounted(async () => {
      const observationId = route.query.observationId;
      if (!observationId) {
        state.error = t('observation.popupMissingChronicleId');
        return;
      }

      const id = Number(observationId);
      if (!Number.isFinite(id) || id <= 0) {
        state.error = t('observation.popupInvalidChronicleId');
        return;
      }

      windowSync.setObservationId(id);

      unsubscribers.push(
        windowSync.on('hydrate:complete', () => {
          state.hydrated = true;
          clearHydrationTimeout();
        })
      );

      unsubscribers.push(
        windowSync.on('popout:close-requested', (payload: { component?: unknown }) => {
          if (!popoutComponent || payload?.component !== popoutComponent) return;
          signalClosed();
          window.close();
        })
      );

      state.loading = true;
      try {
        await observation.methods.loadObservation(id);

        if (popoutComponent) {
          const comp = popoutComponent;
          // Informer la fenêtre principale que ce panneau est désormais incrusté.
          popout.markOpened(comp);
          // Heartbeat pour permettre la réintégration en cas de fermeture brutale.
          heartbeatTimer = window.setInterval(() => {
            popout.heartbeat(comp);
          }, popout.heartbeatIntervalMs);
          window.addEventListener('beforeunload', handleBeforeUnload);
        }

        // Demander l'état "vivant" à l'owner (relevés non encore persistés, etc.).
        // Tant que `hydrate:complete` n'est pas reçu, l'overlay empêche les clics
        // précoces de créer un état local non diffusé ou écrasé par l'hydratation.
        if (popoutComponent) {
          windowSync.broadcast('hydrate:request');
          hydrationTimeout = window.setTimeout(() => {
            state.hydrated = true;
            hydrationTimeout = null;
          }, 3000);
        } else {
          state.hydrated = true;
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la chronique:', error);
        state.error = t('observation.popupChronicleLoadError');
      } finally {
        state.loading = false;
      }
    });

    onUnmounted(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      clearHydrationTimeout();
      signalClosed();
    });

    return {
      componentName,
      popoutComponent,
      state,
    };
  },
});
</script>

<style scoped>
/* La route popup rend sous pages/Index.vue (un <router-view> nu, sans q-layout).
   Or html/body/#q-app { height:100% } est commenté globalement (_layout.scss),
   donc .fit (height:100%) s'effondrait à 0 => écran blanc même avec le bon
   routage. On donne au root une hauteur de viewport définie (100vh) pour que
   les enfants .fit et les composants (VideoPlayer/ButtonsSide) aient une
   hauteur de référence. */
.popup-view-root {
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
}

.popup-hydration-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  background: rgba(252, 252, 252, 0.85);
  backdrop-filter: blur(1px);
  pointer-events: all;
}
</style>
