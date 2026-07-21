<template>
  <div class="calendar-toolbar row items-center q-pa-sm q-gutter-md">
    <!-- Play/Pause button -->
    <q-btn
      round
      :color="observation.sharedState.isPlaying ? 'negative' : 'primary'"
      :icon="observation.sharedState.isPlaying ? 'pause' : 'play_arrow'"
      size="md"
      :disable="attachInProgress"
      @click="handleTogglePlayPause"
    />

    <!-- Stop button -->
    <q-btn
      round
      color="grey-8"
      icon="stop"
      size="sm"
      :disable="!isObservationActive"
      @click="handleStop"
    />

    <!-- Paused indicator: distinct color from the play (resume) and stop
         buttons, so the operator recognizes at a glance that readings are
         locked, without confusing it with the button used to resume. -->
    <q-chip
      v-if="isPausedState"
      class="paused-badge"
      icon="lock"
      dense
    >
      {{ $t('observation.pausedBadge') }}
    </q-chip>

    <!-- Attach video (chronometer without video) -->
    <q-btn
      v-if="showAttachVideo"
      flat
      outline
      color="primary"
      icon="videocam"
      :label="$t('observation.attachVideo')"
      :title="attachVideoTitle"
      size="sm"
      :disable="attachVideoBlocked"
      @click="handleAttachVideo"
    />

    <!-- Spacer -->
    <q-space />

    <!-- Mode toggle -->
    <ModeToggle
      v-if="canChangeMode"
      :current-mode="currentMode"
      :can-change-mode="canChangeMode"
      @mode-change="handleModeChange"
    />

    <!-- Timer -->
    <q-chip color="accent" text-color="white" icon="access_time">
      {{ observation.timerMethods.formatDuration(observation.sharedState.elapsedTime) }}
    </q-chip>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useObservation } from 'src/composables/use-observation';
import { ObservationModeEnum, ReadingTypeEnum } from '@services/observations/interface';
import ModeToggle from './ModeToggle.vue';

export default defineComponent({
  name: 'CalendarToolbar',

  components: {
    ModeToggle,
  },

  setup() {
    const observation = useObservation();
    const $q = useQuasar();
    const { t } = useI18n();
    const attachInProgress = ref(false);

    /**
     * Récupère le mode actuel de l'observation
     * 
     * Retourne 'calendar', 'chronometer' ou null si non défini.
     */
    const currentMode = computed(() => {
      return observation.sharedState.currentObservation?.mode || null;
    });

    /**
     * Vérifie si le mode peut être changé
     * 
     * Le mode ne peut être changé que si l'observation n'a pas encore été démarrée
     * (pas de reading de type START). Une fois démarrée, le mode est figé.
     */
    const canChangeMode = computed(() => {
      const hasStartReading = observation.readings.sharedState.currentReadings.some(
        (reading: any) => reading.type === ReadingTypeEnum.START
      );
      return !hasStartReading;
    });

    const showAttachVideo = computed(() => {
      return observation.isChronometerMode.value
        && !observation.sharedState.currentObservation?.videoPath;
    });

    // Ref imbriquée dans un objet plain : Vue ne l'unwrap pas dans le template
    // (`!observation.isActive` restait toujours false). Même pattern que VideoPlayer.
    const isObservationActive = computed(() => {
      return observation.sharedState.isPlaying
        || observation.sharedState.elapsedTime > 0;
    });

    // Observation démarrée (ou déjà avancée) mais actuellement à l'arrêt :
    // affiche le badge "En pause" pour donner un retour visuel non ambigu,
    // distinct de la couleur du bouton lecture (bleu, "reprendre").
    const isPausedState = computed(() => {
      return !observation.sharedState.isPlaying && isObservationActive.value;
    });

    // Attacher une vidéo alors que le chrono a déjà avancé bascule usesVideoTime
    // et resynchronise elapsedTime sur video.currentTime (souvent 0) → perte d'horloge.
    // attachInProgress couvre la fenêtre dialog → updateObservation (Play possible sinon).
    const attachVideoBlocked = computed(() => {
      return attachInProgress.value
        || observation.sharedState.isPlaying
        || observation.sharedState.elapsedTime > 0;
    });

    const attachVideoTitle = computed(() => {
      return attachVideoBlocked.value
        ? t('observation.attachVideoBlockedTooltip')
        : t('observation.attachVideoTooltip');
    });

    const handleAttachVideo = async () => {
      if (attachVideoBlocked.value) {
        $q.notify({
          type: 'warning',
          message: t('observation.attachVideoBlocked'),
          caption: t('observation.attachVideoBlockedCaption'),
        });
        return;
      }

      if (!window.api || !window.api.showOpenDialog) {
        $q.notify({
          type: 'negative',
          message: t('dialogs.createObservation.electronUnavailable'),
        });
        return;
      }

      try {
        const dialogResult = await window.api.showOpenDialog({
          filters: [
            { name: t('dialogs.createObservation.videoFiles'), extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi'] },
            { name: t('dialogs.createObservation.allFiles'), extensions: ['*'] },
          ],
        });

        if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
          return;
        }

        // Re-vérifier après le dialog (Play possible pendant la sélection).
        if (
          observation.sharedState.isPlaying
          || observation.sharedState.elapsedTime > 0
        ) {
          $q.notify({
            type: 'warning',
            message: t('observation.attachVideoBlocked'),
            caption: t('observation.attachVideoBlockedCaption'),
          });
          return;
        }

        const filePath = dialogResult.filePaths[0];
        const observationId = observation.sharedState.currentObservation?.id;
        if (!observationId) return;

        attachInProgress.value = true;
        try {
          await observation.methods.updateObservation(observationId, {
            videoPath: filePath,
          });
        } finally {
          attachInProgress.value = false;
        }
      } catch (error: any) {
        attachInProgress.value = false;
        $q.notify({
          type: 'negative',
          message: t('dialogs.createObservation.videoSelectError'),
          caption: error.message,
        });
      }
    };

    const handleTogglePlayPause = () => {
      if (attachInProgress.value) return;
      observation.timerMethods.togglePlayPause();
    };

    const handleStop = () => {
      if (!isObservationActive.value) return;
      observation.timerMethods.stopTimer();
      // Aligné sur VideoPlayer : corriger la structure des relevés en fin d'observation.
      observation.readings.methods.autoCorrectReadings(true);
    };

    const handleModeChange = (_mode: ObservationModeEnum) => {
      // Mode change is handled by ModeToggle component
    };

    return {
      observation,
      currentMode,
      canChangeMode,
      isObservationActive,
      isPausedState,
      attachInProgress,
      showAttachVideo,
      attachVideoBlocked,
      attachVideoTitle,
      handleAttachVideo,
      handleTogglePlayPause,
      handleStop,
      handleModeChange,
    };
  },
});
</script>

<style scoped>
.calendar-toolbar {
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid var(--separator);
  flex-shrink: 0;
  min-height: 0;
  height: auto;
}

/* Badge "En pause" : ambre, volontairement distinct du bleu (bouton lecture
   / reprendre) et du rouge (bouton pause pendant l'enregistrement actif),
   pour ne jamais être confondu avec la couleur habituelle de reprise. */
.paused-badge {
  background-color: #fac775 !important;
  color: #412402 !important;
  font-weight: 500;
}

.body--dark .paused-badge {
  background-color: #854f0b !important;
  color: #faeeda !important;
}
</style>

