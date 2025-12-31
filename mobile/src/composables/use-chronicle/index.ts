import { reactive, computed } from 'vue';
import { observationService } from '@services/observation.service';
import type { IProtocolItemWithChildren } from '@database/repositories/protocol.repository';
import type { IReadingEntity } from '@database/repositories/reading.repository';
import { autoCorrectReadings } from '../use-readings-auto-correct';

interface IChronicleObservation {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  mode: 'Calendar' | 'Chronometer';
  createdAt: string;
  updatedAt: string;
}

interface ChronicleState {
  currentChronicle: IChronicleObservation | null;
  currentProtocol: IProtocolItemWithChildren[];
  currentReadings: IReadingEntity[];
  isPlaying: boolean;
  isPaused: boolean;
  elapsedTime: number;
  currentDate: Date | null;
  loading: boolean;
}

const sharedState = reactive<ChronicleState>({
  currentChronicle: null,
  currentProtocol: [],
  currentReadings: [],
  isPlaying: false,
  isPaused: false,
  elapsedTime: 0,
  currentDate: null,
  loading: false,
});

let timerInterval: number | null = null;

export const useChronicle = () => {
  const hasChronicle = computed(() => !!sharedState.currentChronicle);
  const hasReadings = computed(() => sharedState.currentReadings.length > 0);

  // Check if current observation is in Calendar mode
  const isCalendarMode = computed(() => 
    sharedState.currentChronicle?.mode === 'Calendar'
  );

  // Unified formatted time display
  const formattedTime = computed(() => {
    if (sharedState.isPaused) {
      return '⏸ EN PAUSE';
    }
    if (!sharedState.isPlaying) {
      return isCalendarMode.value ? '--:--:--' : '00:00:00.000';
    }
    if (isCalendarMode.value) {
      // Calendar mode: show current time HH:mm:ss
      const now = sharedState.currentDate || new Date();
      return now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } else {
      // Chronometer mode: show elapsed time HH:mm:ss.mmm
      const seconds = sharedState.elapsedTime;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
  });

  const methods = {
    loadChronicle: async (id: number) => {
      sharedState.loading = true;
      try {
        const data = await observationService.getById(id);
        if (data) {
          sharedState.currentChronicle = data.observation as IChronicleObservation;
          sharedState.currentProtocol = data.protocol;
          sharedState.currentReadings = data.readings;
        }
      } finally {
        sharedState.loading = false;
      }
    },

    createChronicle: async (options: { name: string; description?: string }) => {
      const created = await observationService.create(options);
      await methods.loadChronicle(created.id);
      return created;
    },

    unloadChronicle: () => {
      sharedState.currentChronicle = null;
      sharedState.currentProtocol = [];
      sharedState.currentReadings = [];
      methods.stopTimer();
    },

    // Timer methods
    startTimer: () => {
      if (timerInterval) return;

      const startTime = Date.now() - sharedState.elapsedTime * 1000;
      sharedState.isPlaying = true;
      sharedState.isPaused = false;
      sharedState.currentDate = new Date();

      // Use different intervals based on mode:
      // - Calendar mode: update every 1000ms (seconds precision)
      // - Chronometer mode: update every 10ms (milliseconds precision)
      const interval = isCalendarMode.value ? 1000 : 10;

      timerInterval = window.setInterval(() => {
        sharedState.elapsedTime = (Date.now() - startTime) / 1000;
        sharedState.currentDate = new Date();
      }, interval);
    },

    pauseTimer: () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      sharedState.isPlaying = false;
      sharedState.isPaused = true;
    },

    stopTimer: () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      sharedState.isPlaying = false;
      sharedState.isPaused = false;
      sharedState.elapsedTime = 0;
      sharedState.currentDate = null;
    },

    togglePlayPause: () => {
      if (sharedState.isPlaying) {
        methods.pauseTimer();
      } else {
        methods.startTimer();
      }
    },

    // Recording methods
    startRecording: async () => {
      if (!sharedState.currentChronicle) return;
      await observationService.startRecording(sharedState.currentChronicle.id);
      methods.startTimer();
      await methods.refreshReadings();
    },

    stopRecording: async () => {
      if (!sharedState.currentChronicle) return;
      await observationService.stopRecording(sharedState.currentChronicle.id);
      methods.stopTimer();
      // Silently auto-correct readings (baguette magique)
      try {
        await autoCorrectReadings(sharedState.currentChronicle.id);
      } catch (error) {
        // Silently ignore errors during auto-correction
        console.error('Error during auto-correction:', error);
      }
      await methods.refreshReadings();
    },

    pauseRecording: async () => {
      if (!sharedState.currentChronicle) return;
      await observationService.pauseRecording(sharedState.currentChronicle.id);
      methods.pauseTimer();
      await methods.refreshReadings();
    },

    resumeRecording: async () => {
      if (!sharedState.currentChronicle) return;
      await observationService.resumeRecording(sharedState.currentChronicle.id);
      methods.startTimer();
      await methods.refreshReadings();
    },

    toggleObservable: async (observableName: string) => {
      if (!sharedState.currentChronicle) return;
      await observationService.toggleObservable(
        sharedState.currentChronicle.id,
        observableName
      );
      await methods.refreshReadings();
    },

    refreshReadings: async () => {
      if (!sharedState.currentChronicle) return;
      const readings = await observationService.getReadings(
        sharedState.currentChronicle.id
      );
      sharedState.currentReadings = readings;
    },

    formatDuration: (seconds: number): string => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    },
  };

  return {
    sharedState,
    hasChronicle,
    hasReadings,
    isCalendarMode,
    formattedTime,
    methods,
  };
};

