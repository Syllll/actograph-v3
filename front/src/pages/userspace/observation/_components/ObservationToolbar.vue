<template>
  <div class="observation-toolbar q-py-xs full-width">
    <div class="row items-center">
      <div class="col-2">
        <div class="row items-center q-px-md">
          <div
            class="recording-status-indicator"
            :class="{ 'recording-active': observation.sharedState.isPlaying }"
          ></div>
          <span class="q-ml-sm">{{
            observation.sharedState.isPlaying ? 'Enregistrement en cours' : 'Prêt'
          }}</span>
        </div>
      </div>
      <div class="col row flex-center">
        <q-btn
          round
          size="lg"
          :color="observation.sharedState.isPlaying ? 'negative' : 'primary'"
          :icon="observation.sharedState.isPlaying ? 'pause' : 'play_arrow'"
          class="q-mr-md observation-main-control"
          @click="handleTogglePlayPause"
        />

        <!-- Stop button -->
        <q-btn
          round
          color="grey-8"
          icon="stop"
          size="md"
          @click="handleStop"
          :disable="!observation.isActive"
        />
      </div>
      <div class="col-2">
        <q-chip color="accent" text-color="white" icon="access_time">
          {{ observation.timerMethods.formatDuration(observation.sharedState.elapsedTime) }}
        </q-chip>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  name: 'ObservationToolbar',
  emits: ['start', 'pause', 'stop'],

  setup(props, { emit }) {
    const observation = useObservation();

    const handleTogglePlayPause = () => {
      const isPlaying = observation.timerMethods.togglePlayPause();
      // Emit event for parent components
      emit(isPlaying ? 'start' : 'pause');
    };

    const handleStop = () => {
      observation.timerMethods.stopTimer();
      // Emit event for parent components
      emit('stop');
    };

    return {
      observation,
      handleTogglePlayPause,
      handleStop,
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
