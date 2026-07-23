<template>
  <div
    class="calendar-toolbar row items-center q-pa-sm q-gutter-md"
    :class="{ 'toolbar-recording': observation.sharedState.isPlaying }"
  >
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

    <!-- Recording indicator: shown only while actively recording (not
         paused, not stopped), so the operator has a clear, sustained signal
         that readings are being captured right now. -->
    <q-chip
      v-if="observation.sharedState.isPlaying"
      class="recording-badge"
      dense
    >
      <span class="recording-badge-dot q-mr-xs"></span>
      {{ $t('observation.recordingInProgress') }}
    </q-chip>

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

    <!-- Timer : en mode calendrier on affiche l'heure réelle (qui défile en
         continu, y compris en pause) plutôt qu'un chrono qui repart de zéro.
         En mode chronomètre on garde la durée écoulée. -->
    <div class="timer-chip-wrapper">
      <q-chip color="accent" text-color="white" icon="access_time">
        {{
          currentMode === 'calendar'
            ? liveClockLabel
            : observation.timerMethods.formatDuration(observation.sharedState.elapsedTime)
        }}
      </q-chip>
      <!-- Voile "En pause" sur l'horloge, cohérent avec celui du dashboard de
           boutons : l'heure continue de défiler dessous, le voile rappelle
           juste que l'observation (et l'enregistrement des relevés) est en
           pause. -->
      <div
        v-if="currentMode === 'calendar' && isPausedState"
        class="timer-paused-veil"
      >
        <q-icon name="lock" size="12px" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue';
import { useQuasar, date as qDate } from 'quasar';
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

    // Horloge murale (mode calendrier) : indépendante de elapsedTime/isPlaying
    // pour continuer à défiler pendant la pause, où l'intervalle du chrono de
    // l'observation est arrêté (cf. pauseTimer dans use-observation).
    const now = ref(new Date());
    let clockIntervalId: number | null = null;

    onMounted(() => {
      clockIntervalId = window.setInterval(() => {
        now.value = new Date();
      }, 1000);
    });

    onUnmounted(() => {
      if (clockIntervalId !== null) {
        clearInterval(clockIntervalId);
        clockIntervalId = null;
      }
    });

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

    // Observation démarrée (relevé START présent) puis arrêtée (STOP) : l'horloge
    // murale ne doit plus défiler dans cet état, contrairement à la pause où elle
    // continue volontairement (cf. commentaire sur `now` plus haut). On la fige
    // sur l'heure exacte du relevé STOP plutôt que de continuer à afficher l'heure
    // réelle, ce qui donnerait à tort l'impression que l'observation continue.
    const isStoppedState = computed(() => !canChangeMode.value && !isObservationActive.value);

    const stopReadingDate = computed(() => {
      const stopReadings = observation.readings.sharedState.currentReadings.filter(
        (reading: any) => reading.type === ReadingTypeEnum.STOP
      );
      if (stopReadings.length === 0) return null;
      const lastStop = stopReadings[stopReadings.length - 1];
      return lastStop.dateTime instanceof Date ? lastStop.dateTime : new Date(lastStop.dateTime);
    });

    const liveClockLabel = computed(() => {
      const displayDate = isStoppedState.value && stopReadingDate.value
        ? stopReadingDate.value
        : now.value;
      return qDate.formatDate(displayDate, 'HH:mm:ss');
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
      liveClockLabel,
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
  transition: background-color 0.2s ease;
}

/* Bandeau de fond pendant l'enregistrement actif : donne un repère visuel
   perceptible même en vision périphérique, sans attendre de lire le badge
   ou le compteur. Disparaît en pause et à l'arrêt (isPlaying redevient
   false dans les deux cas, cf. use-observation/index.ts). */
.calendar-toolbar.toolbar-recording {
  background-color: rgba(255, 61, 0, 0.07);
}

.body--dark .calendar-toolbar.toolbar-recording {
  background-color: rgba(255, 61, 0, 0.16);
}

/* Badge "Enregistrement en cours" : rouge, même couleur que le bouton
   pause pendant l'enregistrement actif, pour un langage visuel cohérent.
   Le point qui pulse (plutôt que le badge entier qui clignote comme pour
   la pause) signale la capture en continu sans fatiguer l'œil sur une
   session longue. */
.recording-badge {
  background-color: #ff3d00 !important;
  color: white !important;
  font-weight: 500;
}

.recording-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  display: inline-block;
  animation: recording-badge-dot-pulse 1.2s ease-in-out infinite;
}

@keyframes recording-badge-dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recording-badge-dot {
    animation: none;
  }
}

/* Badge "En pause" : ambre, volontairement distinct du bleu (bouton lecture
   / reprendre) et du rouge (bouton pause pendant l'enregistrement actif),
   pour ne jamais être confondu avec la couleur habituelle de reprise.
   Clignotement : signale que l'écran n'est pas figé (l'observation reste en
   pause tant qu'on ne clique pas sur reprendre). */
.paused-badge {
  background-color: #fac775 !important;
  color: #412402 !important;
  font-weight: 500;
  animation: paused-badge-blink 1.4s ease-in-out infinite;
}

.body--dark .paused-badge {
  background-color: #854f0b !important;
  color: #faeeda !important;
}

@keyframes paused-badge-blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .paused-badge {
    animation: none;
  }
}

/* Horloge (mode calendrier) + voile de pause : le chiffre continue de
   défiler derrière le voile, qui rappelle juste visuellement l'état pause,
   avec les mêmes teintes ambre que le badge et le voile du dashboard de
   boutons (buttons-side/Index.vue). */
.timer-chip-wrapper {
  position: relative;
  display: inline-flex;
}

.timer-paused-veil {
  position: absolute;
  inset: -2px;
  border-radius: 16px;
  background-color: rgba(250, 199, 117, 0.55);
  color: #412402;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.body--dark .timer-paused-veil {
  background-color: rgba(133, 79, 11, 0.6);
  color: #faeeda;
}
</style>

