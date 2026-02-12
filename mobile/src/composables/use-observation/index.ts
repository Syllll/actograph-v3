/**
 * @deprecated Currently unused in mobile app.
 * The observation page uses useChronicle instead.
 * TODO: Remove if confirmed unnecessary.
 */
import { reactive, computed, ref, onUnmounted } from 'vue';
import { observationService, type IObservationFull } from '@services/observation.service';
import { protocolService } from '@services/protocol.service';
import type { IReadingEntity } from '@database/repositories/reading.repository';
import { autoCorrectReadings } from '../use-readings-auto-correct';

interface IObservableState {
  id: number;
  name: string;
  categoryName: string;
  color?: string;
  isActive: boolean;
}

interface IRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  startTime: number;
  elapsedTime: number;
  pausedTime: number;
}

const currentObservation = ref<IObservationFull | null>(null);
const observables = ref<IObservableState[]>([]);
const recentReadings = ref<IReadingEntity[]>([]);

const recordingState = reactive<IRecordingState>({
  isRecording: false,
  isPaused: false,
  startTime: 0,
  elapsedTime: 0,
  pausedTime: 0,
});

let timerInterval: ReturnType<typeof setInterval> | null = null;

export function useObservation() {
  const formattedTime = computed(() => {
    const totalSeconds = Math.floor(recordingState.elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  });

  const methods = {
    /**
     * Load an observation by ID
     */
    async loadObservation(id: number): Promise<boolean> {
      try {
        const data = await observationService.getById(id);
        if (!data) {
          currentObservation.value = null;
          observables.value = [];
          return false;
        }

        currentObservation.value = data;

        // Load observables
        const obs = await protocolService.getObservables(id);
        observables.value = obs.map((o) => ({
          ...o,
          isActive: false,
        }));

        // Load recent readings
        recentReadings.value = await observationService.getRecentReadings(id, 10);

        // Check if recording is in progress
        const isRecording = await observationService.isRecording(id);
        if (isRecording) {
          // Restore recording state from readings
          methods.restoreRecordingState();
        }

        return true;
      } catch (error) {
        console.error('Error loading observation:', error);
        return false;
      }
    },

    /**
     * Restore recording state from existing readings
     */
    restoreRecordingState(): void {
      if (!currentObservation.value) return;

      const readings = currentObservation.value.readings;
      const startReading = readings.find((r) => r.type === 'START');
      const stopReading = readings.find((r) => r.type === 'STOP');

      if (startReading && !stopReading) {
        recordingState.isRecording = true;
        recordingState.startTime = new Date(startReading.date).getTime();

        // Calculate paused time
        let pausedTime = 0;
        let pauseStart: Date | null = null;

        for (const reading of readings) {
          if (reading.type === 'PAUSE_START') {
            pauseStart = new Date(reading.date);
          } else if (reading.type === 'PAUSE_END' && pauseStart) {
            pausedTime += new Date(reading.date).getTime() - pauseStart.getTime();
            pauseStart = null;
          }
        }

        // Check if currently paused
        const lastPauseStart = readings
          .filter((r) => r.type === 'PAUSE_START')
          .pop();
        const lastPauseEnd = readings.filter((r) => r.type === 'PAUSE_END').pop();

        if (lastPauseStart) {
          const pauseStartTime = new Date(lastPauseStart.date).getTime();
          const pauseEndTime = lastPauseEnd
            ? new Date(lastPauseEnd.date).getTime()
            : 0;

          if (pauseStartTime > pauseEndTime) {
            recordingState.isPaused = true;
          }
        }

        recordingState.pausedTime = pausedTime;
        methods.startTimer();
      }
    },

    /**
     * Start the timer
     */
    startTimer(): void {
      if (timerInterval) {
        clearInterval(timerInterval);
      }

      timerInterval = setInterval(() => {
        if (!recordingState.isPaused) {
          recordingState.elapsedTime =
            Date.now() - recordingState.startTime - recordingState.pausedTime;
        }
      }, 100);
    },

    /**
     * Stop the timer
     */
    stopTimer(): void {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    },

    /**
     * Start recording
     */
    async startRecording(): Promise<void> {
      if (!currentObservation.value) return;

      const reading = await observationService.startRecording(
        currentObservation.value.observation.id
      );

      recordingState.isRecording = true;
      recordingState.isPaused = false;
      recordingState.startTime = Date.now();
      recordingState.elapsedTime = 0;
      recordingState.pausedTime = 0;

      methods.addToRecentReadings(reading);
      methods.startTimer();
    },

    /**
     * Stop recording
     */
    async stopRecording(): Promise<void> {
      if (!currentObservation.value) return;

      const reading = await observationService.stopRecording(
        currentObservation.value.observation.id
      );

      recordingState.isRecording = false;
      recordingState.isPaused = false;
      methods.stopTimer();

      // Silently auto-correct readings (baguette magique)
      try {
        await autoCorrectReadings(currentObservation.value.observation.id);
      } catch (error) {
        // Silently ignore errors during auto-correction
        console.error('Error during auto-correction:', error);
      }

      methods.addToRecentReadings(reading);
    },

    /**
     * Pause recording
     */
    async pauseRecording(): Promise<void> {
      if (!currentObservation.value) return;

      const reading = await observationService.pauseRecording(
        currentObservation.value.observation.id
      );

      recordingState.isPaused = true;
      methods.addToRecentReadings(reading);
    },

    /**
     * Resume recording
     */
    async resumeRecording(): Promise<void> {
      if (!currentObservation.value) return;

      const reading = await observationService.resumeRecording(
        currentObservation.value.observation.id
      );

      recordingState.isPaused = false;
      methods.addToRecentReadings(reading);
    },

    /**
     * Toggle an observable
     */
    async toggleObservable(observable: IObservableState): Promise<void> {
      if (!currentObservation.value) return;

      const reading = await observationService.toggleObservable(
        currentObservation.value.observation.id,
        observable.name
      );

      // Toggle the state
      const obs = observables.value.find((o) => o.id === observable.id);
      if (obs) {
        obs.isActive = !obs.isActive;
      }

      methods.addToRecentReadings(reading);
    },

    /**
     * Add reading to recent list
     */
    addToRecentReadings(reading: IReadingEntity): void {
      recentReadings.value.unshift(reading);
      if (recentReadings.value.length > 10) {
        recentReadings.value.pop();
      }
    },

    /**
     * Clear current observation
     */
    clear(): void {
      currentObservation.value = null;
      observables.value = [];
      recentReadings.value = [];
      recordingState.isRecording = false;
      recordingState.isPaused = false;
      recordingState.startTime = 0;
      recordingState.elapsedTime = 0;
      recordingState.pausedTime = 0;
      methods.stopTimer();
    },
  };

  // Cleanup on unmount
  onUnmounted(() => {
    methods.stopTimer();
  });

  return {
    // State
    currentObservation,
    observables,
    recentReadings,
    recordingState,
    formattedTime,

    // Methods
    ...methods,
  };
}

