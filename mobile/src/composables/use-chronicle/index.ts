import { reactive, computed } from 'vue';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  convertMobileReadings,
  getActiveRecordingElapsedMs,
  isRecordingActiveFromReadings,
  isRecordingPausedFromReadings,
} from '@actograph/core';
import { observationService } from '@services/observation.service';
import type { IProtocolItemWithChildren } from '@database/repositories/protocol.repository';
import type { IReadingEntity } from '@database/repositories/reading.repository';
import { toAbsoluteTimeString } from '@utils/date-time';

interface IChronicleObservation {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  mode: 'Calendar' | 'Chronometer';
  meta?: Record<string, unknown> | null;
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
let resumeListenerAttached = false;

function clearTimerInterval(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getCoreReadings() {
  return convertMobileReadings(sharedState.currentReadings);
}

export const useChronicle = () => {
  const hasChronicle = computed(() => !!sharedState.currentChronicle);
  const hasReadings = computed(() => sharedState.currentReadings.length > 0);

  const isCalendarMode = computed(() =>
    sharedState.currentChronicle?.mode === 'Calendar'
  );

  const formattedTime = computed(() => {
    if (sharedState.isPaused) {
      return '⏸ EN PAUSE';
    }
    if (!sharedState.isPlaying) {
      return isCalendarMode.value ? '--:--:--' : '00:00:00.000';
    }
    if (isCalendarMode.value) {
      const now = sharedState.currentDate || new Date();
      return toAbsoluteTimeString(now, false);
    }

    const seconds = sharedState.elapsedTime;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  });

  const methods = {
    loadChronicle: async (id: number) => {
      const isChronicleSwitch = sharedState.currentChronicle?.id !== id;
      if (isChronicleSwitch) {
        methods.stopTimer();
      }

      sharedState.loading = true;
      try {
        const data = await observationService.getById(id);
        if (data) {
          sharedState.currentChronicle = data.observation as IChronicleObservation;
          sharedState.currentProtocol = data.protocol;
          sharedState.currentReadings = data.readings;
          methods.syncRecordingStateFromReadings();
        } else {
          sharedState.currentChronicle = null;
          sharedState.currentProtocol = [];
          sharedState.currentReadings = [];
          methods.stopTimer();
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

    duplicateForNewSession: async (sourceId: number) => {
      const created = await observationService.duplicateWithoutReadings(sourceId);
      await methods.loadChronicle(created.id);
      return created;
    },

    unloadChronicle: () => {
      sharedState.currentChronicle = null;
      sharedState.currentProtocol = [];
      sharedState.currentReadings = [];
      methods.stopTimer();
    },

    /**
     * Restore isPlaying / isPaused / elapsedTime from persisted readings.
     * Needed after reload, chronicle switch, or returning from background.
     */
    syncRecordingStateFromReadings: () => {
      const coreReadings = getCoreReadings();
      const recording = isRecordingActiveFromReadings(coreReadings);
      const paused = isRecordingPausedFromReadings(coreReadings);

      if (!recording) {
        if (timerInterval || sharedState.isPlaying || sharedState.isPaused) {
          methods.stopTimer();
        }
        return;
      }

      sharedState.elapsedTime = getActiveRecordingElapsedMs(coreReadings) / 1000;
      sharedState.currentDate = new Date();

      if (paused) {
        clearTimerInterval();
        sharedState.isPlaying = false;
        sharedState.isPaused = true;
        return;
      }

      methods.startTimer();
    },

    startTimer: () => {
      clearTimerInterval();

      const coreReadings = getCoreReadings();
      if (
        isRecordingActiveFromReadings(coreReadings) &&
        !isRecordingPausedFromReadings(coreReadings)
      ) {
        sharedState.elapsedTime = getActiveRecordingElapsedMs(coreReadings) / 1000;
      }

      const startTime = Date.now() - sharedState.elapsedTime * 1000;
      sharedState.isPlaying = true;
      sharedState.isPaused = false;
      sharedState.currentDate = new Date();

      const interval = sharedState.currentChronicle?.mode === 'Calendar' ? 1000 : 10;

      timerInterval = window.setInterval(() => {
        sharedState.elapsedTime = (Date.now() - startTime) / 1000;
        sharedState.currentDate = new Date();
      }, interval);
    },

    pauseTimer: () => {
      clearTimerInterval();
      sharedState.isPlaying = false;
      sharedState.isPaused = true;
    },

    stopTimer: () => {
      clearTimerInterval();
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

    startRecording: async (initialContinuousObservableNames: string[] = []) => {
      if (!sharedState.currentChronicle) return;
      await observationService.startRecording(
        sharedState.currentChronicle.id,
        initialContinuousObservableNames
      );
      methods.startTimer();
      await methods.refreshReadings();
    },

    stopRecording: async () => {
      if (!sharedState.currentChronicle) return;
      await observationService.stopRecording(sharedState.currentChronicle.id);
      methods.stopTimer();

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

  if (!resumeListenerAttached) {
    resumeListenerAttached = true;

    const syncIfVisible = () => {
      if (!sharedState.currentChronicle) return;
      methods.syncRecordingStateFromReadings();
    };

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          syncIfVisible();
        }
      });
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          syncIfVisible();
        }
      });
    }
  }

  return {
    sharedState,
    hasChronicle,
    hasReadings,
    isCalendarMode,
    formattedTime,
    methods,
  };
};
