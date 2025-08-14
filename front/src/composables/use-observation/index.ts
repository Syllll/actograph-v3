import { reactive, ref, computed } from 'vue';
import {
  IObservation,
  IProtocol,
  IReading,
} from '@services/observations/interface';
import { observationService } from '@services/observations/index.service';
import { readingService } from '@services/observations/reading.service';
import { protocolService } from '@services/observations/protocol.service';
import { useProtocol } from './use-protocol';
import { useReadings } from './use-readings';

const sharedState = reactive({
  loading: false,
  currentObservation: null as IObservation | null,
  // Timer state
  isPlaying: false,
  elapsedTime: 0,
  startTime: null as number | null,
  currentDate: null as Date | null,
});

// For timer functionality
let intervalId: number | null = null;

export const useObservation = (options?: { init?: boolean }) => {
  const { init = false } = options || {};

  const protocol = useProtocol({
    sharedStateFromObservation: sharedState,
  });

  const readings = useReadings({
    sharedStateFromObservation: sharedState,
  });

  // This is called only once when the composable is created at the application level
  if (init) {
    // Nothing yet, but if we want to load on observation at startup it should be done here
  }

  // Timer related computed properties
  const isActive = computed(() => sharedState.isPlaying || sharedState.elapsedTime > 0);

  // Timer methods
  const timerMethods = {
    startTimer: () => {
      if (intervalId) return;

      // If there are no readings (0 readings), we add a start reading
      if (readings.sharedState.currentReadings.length === 0) {
        readings.methods.addStartReading();
      } 
      // If there is a reading, we add a pause start reading
      else {
        readings.methods.addPauseEndReading();
      }

      const now = Date.now();

      // If we're starting fresh (not resuming), set the current date
      if (!sharedState.startTime) {
        sharedState.currentDate = new Date();
      }
      
      sharedState.startTime = now - sharedState.elapsedTime * 1000;
      sharedState.isPlaying = true;
      

      intervalId = window.setInterval(() => {
        if (sharedState.startTime) {
          sharedState.elapsedTime = (now - sharedState.startTime) / 1000;
        }
      }, 10); // Update frequently for smooth milliseconds display
    },

    pauseTimer: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      sharedState.isPlaying = false;

      // Add the start of the pause
      readings.methods.addPauseStartReading();
    },

    stopTimer: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      // Add the end of the chronique
      readings.methods.addStopReading();

      sharedState.isPlaying = false;
      sharedState.elapsedTime = 0;
      sharedState.startTime = null;
      sharedState.currentDate = null;
    },

    togglePlayPause: () => {
      if (sharedState.isPlaying) {
        timerMethods.pauseTimer();
      } else {
        timerMethods.startTimer();
      }
      return sharedState.isPlaying;
    },

    formatDuration: (seconds: number): string => {
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
    },
  };

  const methods = {
    cloneExampleObservation: async () => {
      const exampleObservation =
        await observationService.cloneExampleObservation();
      return exampleObservation;
    },
    loadObservation: async (id: number) => {
      sharedState.loading = true;
      const response = await observationService.findOne(id);

      await methods._loadObservation(response);
    },
    _loadObservation: async (observation: IObservation) => {
      sharedState.loading = true;
      sharedState.currentObservation = null;
      readings.sharedState.currentReadings = [];
      protocol.sharedState.currentProtocol = null;

      await readings.methods.loadReadings(observation);

      await protocol.methods.loadProtocol(observation);

      sharedState.currentObservation = observation;

      sharedState.loading = false;
    },
  };

  return {
    sharedState,
    methods,
    protocol,
    readings,
    timerMethods,
    isActive,
  };
};
