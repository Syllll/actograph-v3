<template>
  <div class="calendar-toolbar row items-center q-pa-sm q-gutter-md">
    <!-- Play/Pause button -->
    <q-btn
      round
      :color="observation.sharedState.isPlaying ? 'negative' : 'primary'"
      :icon="observation.sharedState.isPlaying ? 'pause' : 'play_arrow'"
      size="md"
      @click="handleTogglePlayPause"
    />

    <!-- Stop button -->
    <q-btn
      round
      color="grey-8"
      icon="stop"
      size="sm"
      :disable="!observation.isActive"
      @click="handleStop"
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
import { defineComponent, computed } from 'vue';
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

    // Get current mode
    const currentMode = computed(() => {
      return observation.sharedState.currentObservation?.mode || null;
    });

    // Check if mode can be changed (observation not started)
    const canChangeMode = computed(() => {
      const hasStartReading = observation.readings.sharedState.currentReadings.some(
        (reading: any) => reading.type === ReadingTypeEnum.START
      );
      return !hasStartReading;
    });

    const handleTogglePlayPause = () => {
      observation.timerMethods.togglePlayPause();
    };

    const handleStop = () => {
      observation.timerMethods.stopTimer();
    };

    const handleModeChange = (mode: ObservationModeEnum) => {
      // Mode change is handled by ModeToggle component
      // This handler is here for potential future use
    };

    return {
      observation,
      currentMode,
      canChangeMode,
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
</style>

