<template>
  <div class="observation-session-bar">
    <div class="observation-toolbar-row">
      <span class="observation-toolbar-host">
        <q-btn
          unelevated
          no-caps
          class="observation-toolbar-control"
          :class="recPauseBtnClass"
          :disable="recDisabled"
          :aria-label="recPauseLabel"
          @click="methods.onRecPauseClick"
        >
          <q-icon :name="recPauseIcon" size="18px" />
          <span>{{ recPauseLabel }}</span>
        </q-btn>
        <q-tooltip v-if="recDisabled && !attachInProgress">
          {{ $t('observation.noProtocolSessionDisabled') }}
        </q-tooltip>
      </span>

      <span class="observation-toolbar-host">
        <q-btn
          unelevated
          no-caps
          class="observation-toolbar-control observation-toolbar-btn--ghost"
          :disable="terminerDisabled"
          :aria-label="$t('observation.sessionTerminer')"
          @click="methods.onTerminerClick"
        >
          <q-icon name="stop" size="18px" />
          <span>{{ $t('observation.sessionTerminer') }}</span>
        </q-btn>
        <q-tooltip v-if="terminerDisabled && protocolMissing">
          {{ $t('observation.noProtocolSessionDisabled') }}
        </q-tooltip>
      </span>

      <ModeToggle
        v-if="canChangeMode"
        :current-mode="currentMode"
        :can-change-mode="canChangeMode"
        :disabled="attachInProgress"
      />

      <div
        v-if="sessionStatusChip"
        class="observation-toolbar-control observation-toolbar-chip"
      >
        <q-icon :name="sessionStatusChip.icon" size="18px" />
        <span>{{ sessionStatusChip.label }}</span>
      </div>

      <q-space />

      <div class="timer-chip-wrapper">
        <div
          class="observation-toolbar-control observation-toolbar-chip observation-toolbar-chip--timer"
          :aria-label="timerChipAriaLabel"
        >
          <q-icon :name="timerChipIcon" size="18px" />
          <span>{{
            currentMode === 'calendar'
              ? liveClockLabel
              : observation.timerMethods.formatDuration(observation.sharedState.elapsedTime)
          }}</span>
          <q-tooltip>{{ timerChipAriaLabel }}</q-tooltip>
        </div>
        <div
          v-if="currentMode === 'calendar' && isPausedState"
          class="timer-paused-veil"
        >
          <q-icon name="lock" size="12px" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue';
import { date as qDate } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useObservation } from 'src/composables/use-observation';
import { ReadingTypeEnum } from '@services/observations/interface';
import {
  formatCalendarDateTime,
  getObservationTimeZone,
  isRecordingActiveFromReadings,
} from '@actograph/core';
import ModeToggle from './ModeToggle.vue';
import {
  confirmAndCompleteObservationStop,
  handleRecPauseClick,
  hasAnyStopReading,
  isProtocolMissing,
  isSessionStarted,
} from './observation-session-actions';

export default defineComponent({
  name: 'ObservationSessionBar',

  components: {
    ModeToggle,
  },

  props: {
    attachInProgress: {
      type: Boolean,
      default: false,
    },
  },

  setup(props) {
    const observation = useObservation();
    const { t } = useI18n();

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

    const currentMode = computed(() => {
      return observation.sharedState.currentObservation?.mode || null;
    });

    const canChangeMode = computed(() => {
      const hasStartReading = observation.readings.sharedState.currentReadings.some(
        (reading) => reading.type === ReadingTypeEnum.START,
      );
      return !hasStartReading;
    });

    const isObservationActive = computed(() => {
      return observation.sharedState.isPlaying
        || observation.sharedState.elapsedTime > 0;
    });

    const isPausedState = computed(() => {
      return !observation.sharedState.isPlaying && isObservationActive.value;
    });

    const isStoppedState = computed(() => !canChangeMode.value && !isObservationActive.value);

    const stopReadingDate = computed(() => {
      const stopReadings = observation.readings.sharedState.currentReadings.filter(
        (reading) => reading.type === ReadingTypeEnum.STOP,
      );
      if (stopReadings.length === 0) return null;
      const lastStop = stopReadings[stopReadings.length - 1];
      return lastStop.dateTime instanceof Date
        ? lastStop.dateTime
        : new Date(lastStop.dateTime);
    });

    const liveClockLabel = computed(() => {
      const displayDate = isStoppedState.value && stopReadingDate.value
        ? stopReadingDate.value
        : now.value;
      if (currentMode.value === 'chronometer') {
        return qDate.formatDate(displayDate, 'HH:mm:ss');
      }
      const timeZone = getObservationTimeZone(
        observation.sharedState.currentObservation?.meta,
      );
      return formatCalendarDateTime(displayDate, timeZone, 'HH:mm:ss');
    });

    const timerChipIcon = computed(() => {
      if (currentMode.value === 'calendar') {
        return isStoppedState.value ? 'outlined_flag' : 'access_time';
      }
      if (isPausedState.value) {
        return 'pause';
      }
      return 'timer';
    });

    const timerChipAriaLabel = computed(() => {
      if (currentMode.value === 'calendar') {
        return isStoppedState.value
          ? t('observation.timerChipEnded')
          : t('observation.timerChipClock');
      }
      if (isPausedState.value) {
        return t('observation.timerChipPaused');
      }
      return t('observation.timerChipElapsed');
    });

    const recPauseLabel = computed(() => {
      return observation.sharedState.isPlaying
        ? t('observation.sessionPause')
        : t('observation.sessionRec');
    });

    /** Record dot when idle; Material pause (two bars) when recording. */
    const recPauseIcon = computed(() => {
      return observation.sharedState.isPlaying ? 'pause' : 'fiber_manual_record';
    });

    const recPauseBtnClass = computed(() => {
      return observation.sharedState.isPlaying
        ? 'observation-toolbar-btn--ghost'
        : 'observation-toolbar-btn--filled';
    });

    const protocolMissing = computed(() => isProtocolMissing(observation));

    const recDisabled = computed(
      () => props.attachInProgress || protocolMissing.value,
    );

    // Same gate as the old CalendarToolbar stop: no STOP without a session.
    const terminerDisabled = computed(
      () => !isSessionStarted(observation),
    );

    // Exclusive: new segment while recording after a STOP, else ended if the
    // last START/STOP is STOP (Terminer), else pause. Ended must beat pause:
    // video timeupdate used to restore elapsedTime after stopTimer, which
    // made the chip stay on "paused".
    const sessionStatusChip = computed(() => {
      const hasStop = hasAnyStopReading(observation);
      const recordingActive = isRecordingActiveFromReadings(
        observation.readings.sharedState.currentReadings,
      );
      if (observation.sharedState.isPlaying && hasStop) {
        return { icon: 'info', label: t('observation.newSegmentStarted') };
      }
      if (hasStop && !recordingActive && !observation.sharedState.isPlaying) {
        return { icon: 'outlined_flag', label: t('observation.observationEndedToast') };
      }
      if (isPausedState.value) {
        return { icon: 'pause', label: t('observation.observationPausedToast') };
      }
      if (hasStop) {
        return { icon: 'outlined_flag', label: t('observation.observationEndedToast') };
      }
      return null;
    });

    const methods = {
      onRecPauseClick: () => {
        handleRecPauseClick(observation);
      },
      onTerminerClick: async () => {
        await confirmAndCompleteObservationStop(observation);
      },
    };

    return {
      observation,
      currentMode,
      canChangeMode,
      isPausedState,
      sessionStatusChip,
      liveClockLabel,
      timerChipIcon,
      timerChipAriaLabel,
      recPauseLabel,
      recPauseIcon,
      recPauseBtnClass,
      protocolMissing,
      recDisabled,
      terminerDisabled,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.observation-session-bar {
  width: 100%;
  min-width: 0;
}

.timer-chip-wrapper {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  height: var(--observation-toolbar-h);
  align-items: center;
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
