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
        <div class="row items-center q-gutter-sm">
          <!-- Mode indicator and toggle buttons -->
          <q-chip 
            v-if="currentMode"
            :color="currentMode === 'chronometer' ? 'primary' : 'grey-7'"
            text-color="white"
            :icon="currentMode === 'chronometer' ? 'timer' : 'event'"
            size="sm"
          >
            {{ currentMode === 'chronometer' ? 'Mode Chronomètre' : 'Mode Calendrier' }}
          </q-chip>
          
          <!-- Mode toggle buttons (only if observation not started) -->
          <div v-if="canChangeMode" class="row q-gutter-xs">
            <q-btn
              :color="currentMode === 'calendar' ? 'primary' : 'grey-5'"
              :outline="currentMode !== 'calendar'"
              icon="event"
              label="Calendrier"
              size="sm"
              dense
              @click="handleSwitchMode('calendar')"
            >
              <q-tooltip>Passer en mode calendrier</q-tooltip>
            </q-btn>
            <q-btn
              :color="currentMode === 'chronometer' ? 'primary' : 'grey-5'"
              :outline="currentMode !== 'chronometer'"
              icon="timer"
              label="Chronomètre"
              size="sm"
              dense
              @click="handleSwitchMode('chronometer')"
            >
              <q-tooltip>Passer en mode chronomètre</q-tooltip>
            </q-btn>
          </div>
          
        <q-chip color="accent" text-color="white" icon="access_time">
          {{ observation.timerMethods.formatDuration(observation.sharedState.elapsedTime) }}
        </q-chip>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { ObservationModeEnum, ReadingTypeEnum } from '@services/observations/interface';
import { useQuasar } from 'quasar';
import { createDialog } from '@lib-improba/utils/dialog.utils';

export default defineComponent({
  name: 'ObservationToolbar',
  emits: ['start', 'pause', 'stop'],

  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();
    
    const isChronometerMode = computed(() => observation.isChronometerMode.value);
    
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
      const isPlaying = observation.timerMethods.togglePlayPause();
      // Emit event for parent components
      emit(isPlaying ? 'start' : 'pause');
    };

    const handleStop = () => {
      observation.timerMethods.stopTimer();
      // Emit event for parent components
      emit('stop');
    };
    
    const handleSwitchMode = async (newMode: 'calendar' | 'chronometer') => {
      // Don't switch if already in that mode
      if (currentMode.value === newMode) {
        return;
      }
      
      // Double check that we can change mode
      if (!canChangeMode.value) {
        $q.notify({
          type: 'negative',
          message: 'Impossible de changer de mode',
          caption: 'L\'observation a déjà été démarrée',
        });
        return;
      }
      
      // Confirm action
      const modeLabel = newMode === 'chronometer' ? 'chronomètre' : 'calendrier';
      const dialog = await createDialog({
        title: `Passer en mode ${modeLabel}`,
        message: `Voulez-vous passer cette observation en mode ${modeLabel} ? Cette action est irréversible.`,
        cancel: 'Annuler',
        ok: {
          label: 'Changer',
          color: 'primary',
        },
        persistent: true,
      });
      
      if (!dialog) return;
      
      // Update observation mode
      const observationId = observation.sharedState.currentObservation?.id;
      if (!observationId) {
        $q.notify({
          type: 'negative',
          message: 'Erreur',
          caption: 'Observation introuvable',
        });
        return;
      }
      
      try {
        await observation.methods.updateObservation(observationId, {
          mode: newMode === 'chronometer' ? ObservationModeEnum.Chronometer : ObservationModeEnum.Calendar,
        });
        
        $q.notify({
          type: 'positive',
          message: `Mode ${modeLabel} activé`,
          caption: `L'observation est maintenant en mode ${modeLabel}`,
        });
      } catch (error: any) {
        $q.notify({
          type: 'negative',
          message: 'Erreur lors du changement de mode',
          caption: error.message || 'Une erreur est survenue',
        });
      }
    };

    return {
      observation,
      isChronometerMode,
      currentMode,
      canChangeMode,
      handleTogglePlayPause,
      handleStop,
      handleSwitchMode,
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
