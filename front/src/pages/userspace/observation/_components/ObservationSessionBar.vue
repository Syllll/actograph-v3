<template>
  <div class="observation-session-bar">
    <div class="row items-center q-gutter-sm session-bar-row">
      <span>
        <q-btn
          :color="recPauseColor"
          :text-color="recPauseTextColor"
          :unelevated="!observation.sharedState.isPlaying"
          :outline="observation.sharedState.isPlaying"
          dense
          no-caps
          padding="6px 12px"
          class="observation-session-cta"
          :disable="recDisabled"
          :aria-label="recPauseLabel"
          @click="methods.onRecPauseClick"
        >
          <span class="session-cta-content">
            <q-icon :name="recPauseIcon" size="18px" />
            <span>{{ recPauseLabel }}</span>
          </span>
        </q-btn>
        <q-tooltip v-if="recDisabled && !attachInProgress">
          {{ $t('observation.noProtocolSessionDisabled') }}
        </q-tooltip>
      </span>

      <span>
        <q-btn
          color="primary"
          outline
          dense
          no-caps
          padding="6px 12px"
          class="observation-session-cta"
          :disable="terminerDisabled"
          :aria-label="$t('observation.sessionTerminer')"
          @click="methods.onTerminerClick"
        >
          <span class="session-cta-content">
            <q-icon name="stop" size="18px" />
            <span>{{ $t('observation.sessionTerminer') }}</span>
          </span>
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

      <q-chip
        v-if="sessionStatusChip"
        dense
        :icon="sessionStatusChip.icon"
        class="session-status-chip col-shrink"
      >
        {{ sessionStatusChip.label }}
      </q-chip>

      <q-space />

      <div class="timer-chip-wrapper col-shrink">
        <q-chip
          color="accent"
          text-color="white"
          :icon="timerChipIcon"
          :aria-label="timerChipAriaLabel"
        >
          {{
            currentMode === 'calendar'
              ? liveClockLabel
              : observation.timerMethods.formatDuration(observation.sharedState.elapsedTime)
          }}
          <q-tooltip>{{ timerChipAriaLabel }}</q-tooltip>
        </q-chip>
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
      return qDate.formatDate(displayDate, 'HH:mm:ss');
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

    const recPauseColor = computed(() => {
      return observation.sharedState.isPlaying ? 'primary' : 'accent';
    });

    const recPauseTextColor = computed(() => {
      return observation.sharedState.isPlaying ? undefined : 'white';
    });

    const protocolMissing = computed(() => isProtocolMissing(observation));

    const recDisabled = computed(
      () => props.attachInProgress || protocolMissing.value,
    );

    // Same gate as the old CalendarToolbar stop: no STOP without a session.
    const terminerDisabled = computed(
      () => !isSessionStarted(observation),
    );

    // Exclusive: new segment while recording after a STOP, else pause, else ended.
    const sessionStatusChip = computed(() => {
      const hasStop = hasAnyStopReading(observation);
      if (observation.sharedState.isPlaying && hasStop) {
        return { icon: 'info', label: t('observation.newSegmentStarted') };
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
      recPauseColor,
      recPauseTextColor,
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
}

.session-bar-row {
  flex-wrap: wrap;
}

/* Aligné sur protocol-cta-btn / cta-btn (userspace). */
.observation-session-cta {
  border-radius: 0.5rem;
  font-weight: 500;
  min-width: 0;
  width: auto;
}

.observation-session-cta.q-btn--outline {
  background: #fff;
}

.session-cta-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}

.observation-session-cta :deep(.q-btn__content) {
  justify-content: center;
}

.body--dark .observation-session-cta.q-btn--outline {
  background: transparent;
}

.session-status-chip {
  max-width: 100%;
  background: rgba(31, 41, 55, 0.08);
  color: var(--primary);
  font-weight: 500;
}

.body--dark .session-status-chip {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

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
