<template>
  <div class="observation-toolbar q-py-xs full-width">
    <div class="row items-center">
      <div class="col-2">
        <div class="row items-center q-px-md">
          <div
            class="recording-status-indicator"
            :class="{ 'recording-active': isPlaying }"
          ></div>
          <span class="q-ml-sm">{{
            isPlaying ? 'Enregistrement en cours' : 'Prêt'
          }}</span>
        </div>
      </div>
      <div class="col row flex-center">
        <q-btn
          round
          size="lg"
          :color="isPlaying ? 'negative' : 'primary'"
          :icon="isPlaying ? 'pause' : 'play_arrow'"
          class="q-mr-md observation-main-control"
          @click="togglePlayPause"
        />

        <!-- Stop button -->
        <q-btn
          round
          color="grey-8"
          icon="stop"
          size="md"
          @click="stopObservation"
          :disable="!isActive"
        />
      </div>
      <div class="col-2">
        <q-chip color="accent" text-color="white" icon="access_time">
          {{ formatDuration(elapsedTime) }}
        </q-chip>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';

export default defineComponent({
  name: 'ObservationToolbar',

  setup() {
    const isPlaying = ref(false);
    const elapsedTime = ref(0);
    const intervalId = ref<number | null>(null);
    const startTime = ref<number | null>(null);

    const isActive = computed(() => isPlaying.value || elapsedTime.value > 0);

    const startTimer = () => {
      if (intervalId.value) return;

      startTime.value = Date.now() - elapsedTime.value * 1000;

      intervalId.value = window.setInterval(() => {
        if (startTime.value) {
          elapsedTime.value = (Date.now() - startTime.value) / 1000;
        }
      }, 10); // Update more frequently for smooth milliseconds
    };

    const stopTimer = () => {
      if (intervalId.value) {
        clearInterval(intervalId.value);
        intervalId.value = null;
      }
    };

    const togglePlayPause = () => {
      isPlaying.value = !isPlaying.value;

      if (isPlaying.value) {
        startTimer();
      } else {
        stopTimer();
      }

      // Emit event for parent components
      emit(isPlaying.value ? 'start' : 'pause');
    };

    const stopObservation = () => {
      isPlaying.value = false;
      stopTimer();
      elapsedTime.value = 0;
      startTime.value = null;

      // Emit event for parent components
      emit('stop');
    };

    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      const milliseconds = Math.floor((seconds % 1) * 1000);

      return (
        [
          hours.toString().padStart(2, '0'),
          minutes.toString().padStart(2, '0'),
          remainingSeconds.toString().padStart(2, '0'),
        ].join(':') +
        '.' +
        milliseconds.toString().padStart(3, '0')
      );
    };

    const emit = (event: string) => {
      // This is a placeholder for emitting events to parent
      // You can replace this with actual event handling logic
      console.log(`Emitted: ${event}`);
    };

    return {
      isPlaying,
      elapsedTime,
      startTime,
      isActive,
      togglePlayPause,
      stopObservation,
      formatDuration,
    };
  },
});
</script>

<style scoped>
.observation-toolbar {
  background-color: rgba(255, 255, 255, 0.95);
  border-top: 1px solid #e0e0e0;
}

.recording-status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #bdbdbd;
  display: inline-block;
  transition: all 0.3s ease;
}

.recording-active {
  background-color: var(--q-accent);
  box-shadow: 0 0 0 rgba(255, 0, 0, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
  }
}
</style>
