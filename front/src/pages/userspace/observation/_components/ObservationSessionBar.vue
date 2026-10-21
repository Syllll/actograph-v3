<template>
  <div class="observation-session-bar">
    <div v-if="isManualEntry" class="manual-entry-notice" role="status">
      <div class="row items-center q-gutter-xs">
        <q-icon name="edit_note" size="18px" />
        <strong>{{ $t('observation.manualEntryLabel') }}</strong>
        <q-space />
        <MiniGraphToggle />
      </div>
      <div class="text-caption">{{ $t('observation.manualEntryHint') }}</div>
    </div>
    <div v-else class="observation-toolbar-row">
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

      <span v-if="isObservationActive" class="observation-toolbar-host">
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
        role="status"
        aria-live="polite"
      >
        <q-icon :name="sessionStatusChip.icon" size="18px" />
        <span>{{ sessionStatusChip.label }}</span>
      </div>

      <MiniGraphToggle />
      <q-space />

      <div class="timer-chip-wrapper">
        <div
          class="observation-toolbar-control observation-toolbar-chip"
          :class="{ 'observation-toolbar-chip--timer': isObservationActive }"
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
import { defineComponent, computed, ref, watch, onUnmounted } from 'vue';
import { date as qDate } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useObservation } from 'src/composables/use-observation';
import { ReadingTypeEnum } from '@services/observations/interface';
import {
  formatCalendarDateTime,
  getObservationTimeZone,
} from '@actograph/core';
import ModeToggle from './ModeToggle.vue';
import MiniGraphToggle from 'src/components/mini-graph/MiniGraphToggle.vue';
import {
  confirmAndCompleteObservationStop,
  handleRecPauseClick,
  isProtocolMissing,
} from './observation-session-actions';

export default defineComponent({
  name: 'ObservationSessionBar',

  components: {
    ModeToggle,
    MiniGraphToggle,
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

    const isManualEntry = computed(() =>
      observation.sharedState.currentObservation?.meta?.entryMode === 'manual',
    );

    watch(isManualEntry, (manual) => {
      if (clockIntervalId !== null) {
        clearInterval(clockIntervalId);
        clockIntervalId = null;
      }
      if (!manual) {
        clockIntervalId = window.setInterval(() => {
          now.value = new Date();
        }, 1000);
      }
    }, { immediate: true });

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

    // Saved START/STOP rows and video seeks are historical data. A runtime
    // session exists only after this window has started or resumed recording.
    const isObservationActive = computed(() =>
      observation.sharedState.isPlaying || observation.sharedState.startTime != null,
    );

    const isPausedState = computed(() =>
      isObservationActive.value && !observation.sharedState.isPlaying,
    );

    const liveClockLabel = computed(() => {
      if (currentMode.value === 'chronometer') {
        return qDate.formatDate(now.value, 'HH:mm:ss');
      }
      const timeZone = getObservationTimeZone(
        observation.sharedState.currentObservation?.meta,
      );
      return formatCalendarDateTime(now.value, timeZone, 'HH:mm:ss');
    });

    const timerChipIcon = computed(() => {
      if (currentMode.value === 'calendar') {
        return 'access_time';
      }
      if (isPausedState.value) {
        return 'pause';
      }
      return 'timer';
    });

    const timerChipAriaLabel = computed(() => {
      if (currentMode.value === 'calendar') {
        return t('observation.timerChipClock');
      }
      if (isPausedState.value) {
        return t('observation.timerChipPaused');
      }
      return t('observation.timerChipElapsed');
    });

    const recPauseLabel = computed(() => {
      return observation.sharedState.isPlaying
        ? t('observation.sessionPause')
        : isPausedState.value
          ? t('observation.sessionResume')
          : t('observation.sessionStart');
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

    const terminerDisabled = computed(() => props.attachInProgress || !isObservationActive.value);

    const sessionStatusChip = computed(() => {
      if (observation.sharedState.isPlaying) {
        return { icon: 'fiber_manual_record', label: t('observation.sessionActive') };
      }
      if (isPausedState.value) {
        return { icon: 'pause', label: t('observation.sessionPaused') };
      }
      return { icon: 'info_outline', label: t('observation.sessionInactive') };
    });

    const methods = {
      onRecPauseClick: () => {
        if (isManualEntry.value || recDisabled.value) return;
        handleRecPauseClick(observation);
      },
      onTerminerClick: async () => {
        if (isManualEntry.value || terminerDisabled.value) return;
        await confirmAndCompleteObservationStop(observation);
      },
    };

    return {
      observation,
      isManualEntry,
      currentMode,
      canChangeMode,
      isObservationActive,
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

.manual-entry-notice {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--neutral-low, rgba(0, 0, 0, 0.04));
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
