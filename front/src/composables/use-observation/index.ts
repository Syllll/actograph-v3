import { reactive, computed, watch } from 'vue';
import {
  IObservation,
  IReading,
  ObservationModeEnum,
  ReadingTypeEnum,
} from '@services/observations/interface';
import { observationService } from '@services/observations/index.service';
import { isRecordingActiveFromReadings } from '@actograph/core';
import { useProtocol } from './use-protocol';
import { useReadings } from './use-readings';
import { useDuration } from '../use-duration';
import { CHRONOMETER_T0 } from '@utils/chronometer.constants';
import { useWindowSync } from '../use-window-sync';

const sharedState = reactive({
  loading: false,
  currentObservation: null as IObservation | null,
  isPlaying: false,
  elapsedTime: 0,
  startTime: null as number | null,
  currentDate: null as Date | null,
});

export function getCurrentObservationSummary(): string {
  const obs = sharedState.currentObservation;
  if (obs?.name) return obs.name;
  if (obs?.id != null) return String(obs.id);
  return 'n/a';
}

let intervalId: number | null = null;
let hasSetupObservationWindowSync = false;
let followerObservationMetaHydrated = false;

type ObservationMetaPayload = Pick<
  IObservation,
  'id' | 'name' | 'description' | 'videoPath' | 'mode' | 'meta'
>;

const buildObservationMetaPayload = (
  observation: IObservation,
): ObservationMetaPayload => ({
  id: observation.id,
  name: observation.name,
  description: observation.description,
  videoPath: observation.videoPath,
  mode: observation.mode,
  meta: observation.meta,
});

const isObservationMetaPayload = (
  payload: unknown,
): payload is ObservationMetaPayload => {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<ObservationMetaPayload>;
  return typeof candidate.id === 'number';
};

export const useObservation = (options?: { init?: boolean }) => {
  const { init = false } = options || {};

  const protocol = useProtocol({
    sharedStateFromObservation: sharedState,
  });

  const readings = useReadings({
    sharedStateFromObservation: sharedState,
  });

  if (init) {
    // Nothing yet, but if we want to load one observation at startup it should be done here.
  }

  const duration = useDuration();
  const windowSync = useWindowSync();

  const isActive = computed(
    () => sharedState.isPlaying || sharedState.elapsedTime > 0,
  );

  const isChronometerMode = computed(() => {
    return sharedState.currentObservation?.mode === ObservationModeEnum.Chronometer;
  });

  const usesVideoTime = computed(() => {
    return isChronometerMode.value && !!sharedState.currentObservation?.videoPath;
  });

  const broadcastObservationMeta = () => {
    if (!sharedState.currentObservation?.id) return;
    windowSync.broadcast(
      'state:observation-meta',
      buildObservationMetaPayload(sharedState.currentObservation),
    );
  };

  const applyObservationMeta = (payload: ObservationMetaPayload) => {
    const current = sharedState.currentObservation;
    if (!current || current.id !== payload.id) return;

    sharedState.currentObservation = {
      ...current,
      name: payload.name,
      description: payload.description,
      videoPath: payload.videoPath,
      mode: payload.mode,
      meta: payload.meta,
    };
  };

  const updateTimeFromSource = (videoTime?: number) => {
    if (usesVideoTime.value && videoTime !== undefined) {
      sharedState.elapsedTime = videoTime;
      const t0 = chronometerMethods.getT0();
      const elapsedMs = videoTime * 1000;
      sharedState.currentDate = new Date(t0.getTime() + elapsedMs);
      return;
    }

    if (!usesVideoTime.value && sharedState.startTime) {
      sharedState.elapsedTime = (Date.now() - sharedState.startTime) / 1000;

      if (isChronometerMode.value) {
        const t0 = chronometerMethods.getT0();
        const elapsedMs = sharedState.elapsedTime * 1000;
        sharedState.currentDate = new Date(t0.getTime() + elapsedMs);
      } else {
        sharedState.currentDate = new Date(
          sharedState.startTime + sharedState.elapsedTime * 1000,
        );
      }
    }
  };

  const timerMethods = {
    startTimer: () => {
      if (sharedState.isPlaying) return;

      const shouldCreateStartReading = !isRecordingActiveFromReadings(
        readings.sharedState.currentReadings,
      );

      if (shouldCreateStartReading) {
        readings.methods.addStartReading();
      } else {
        readings.methods.addPauseEndReading();
      }

      const now = Date.now();

      // Mode calendrier : currentDate doit toujours refléter l'heure réelle
      // actuelle au (re)démarrage, y compris à la reprise après une pause.
      // Sans ce `else` inconditionnel, startTime restait non-null après une
      // pause (seul stopTimer le remet à null) et ce bloc ne s'exécutait
      // qu'au tout premier démarrage : la reprise réutilisait alors le
      // currentDate figé au moment de la mise en pause, et le relevé
      // "fin de pause" (ajouté juste après avec ce currentDate) enregistrait
      // l'heure de la pause au lieu de l'heure de reprise.
      if (isChronometerMode.value) {
        if (!sharedState.startTime) {
          const t0 = chronometerMethods.getT0();
          const elapsedMs = sharedState.elapsedTime * 1000;
          sharedState.currentDate = new Date(t0.getTime() + elapsedMs);
        }
      } else {
        sharedState.currentDate = new Date(now);
      }

      sharedState.startTime = now - sharedState.elapsedTime * 1000;
      sharedState.isPlaying = true;
    },

    pauseTimer: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      sharedState.isPlaying = false;
      readings.methods.addPauseStartReading();
    },

    stopTimer: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

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

  const chronometerMethods = {
    getT0: (): Date => {
      return CHRONOMETER_T0;
    },

    dateToDuration: (date: Date): number => {
      if (!isChronometerMode.value) {
        throw new Error('Cannot convert date to duration: not in chronometer mode');
      }
      return duration.dateToDuration(date, CHRONOMETER_T0);
    },

    durationToDate: (milliseconds: number): Date => {
      if (!isChronometerMode.value) {
        throw new Error('Cannot convert duration to date: not in chronometer mode');
      }
      return duration.durationToDate(milliseconds, CHRONOMETER_T0);
    },

    formatDateAsDuration: (date: Date): string => {
      if (!isChronometerMode.value) {
        throw new Error('Cannot format date as duration: not in chronometer mode');
      }
      return duration.formatFromDate(date, CHRONOMETER_T0);
    },
  };

  const methods = {
    cloneExampleObservation: async () => {
      return await observationService.cloneExampleObservation();
    },

    cloneExampleObservationByKey: async (exampleKey: string) => {
      return await observationService.cloneExampleObservationByKey(exampleKey);
    },

    loadObservation: async (id: number) => {
      sharedState.loading = true;
      try {
        const response = await observationService.findOne(id);
        await methods._loadObservation(response);
      } catch (error) {
        sharedState.loading = false;
        throw error;
      }
    },

    createObservation: async (options: {
      name: string;
      description?: string;
      videoPath?: string;
      mode?: ObservationModeEnum;
    }) => {
      const response = await observationService.create(options);
      await methods.loadObservation(response.id);
    },

    updateObservation: async (id: number, updateData: {
      name?: string;
      description?: string;
      videoPath?: string;
      mode?: ObservationModeEnum;
    }) => {
      const response = await observationService.update(id, updateData);

      // Ne pas recharger toute l'observation ici : dans une fenêtre pop-out déjà
      // hydratée, un reload complet peut rediffuser des relevés persistés mais
      // plus vieux que l'état vivant de l'owner. On applique uniquement les
      // métadonnées mises à jour, puis on les propage aux autres fenêtres.
      if (sharedState.currentObservation?.id === id) {
        sharedState.currentObservation = {
          ...sharedState.currentObservation,
          ...response,
        };
      } else {
        await methods.loadObservation(id);
      }

      broadcastObservationMeta();
      return response;
    },

    closeObservation: () => {
      windowSync.setObservationId(null);
      followerObservationMetaHydrated = false;

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      sharedState.loading = false;
      sharedState.currentObservation = null;
      sharedState.isPlaying = false;
      sharedState.elapsedTime = 0;
      sharedState.startTime = null;
      sharedState.currentDate = null;
      readings.sharedState.currentReadings = [];
      protocol.sharedState.currentProtocol = null;
    },

    _loadObservation: async (observation: IObservation) => {
      windowSync.setObservationId(observation?.id ?? null);
      sharedState.loading = true;
      sharedState.currentObservation = null;
      readings.sharedState.currentReadings = [];
      protocol.sharedState.currentProtocol = null;

      // sharedState est un singleton partagé par toute l'appli : sans ce reset,
      // currentDate/elapsedTime/startTime d'une précédente observation en mode
      // chronomètre (basée sur CHRONOMETER_T0, 9 février 1989) fuitent vers
      // l'observation qu'on charge ici (ex: une chronique dupliquée), qui les
      // réutilise ensuite via le fallback `currentDate || new Date()`.
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      sharedState.isPlaying = false;
      sharedState.elapsedTime = 0;
      sharedState.startTime = null;
      sharedState.currentDate = null;

      try {
        await readings.methods.loadReadings(observation);
        await protocol.methods.loadProtocol(observation);
        sharedState.currentObservation = observation;
      } finally {
        sharedState.loading = false;
      }
    },
  };

  if (!hasSetupObservationWindowSync) {
    hasSetupObservationWindowSync = true;

    watch(
      () => sharedState.isPlaying,
      (playing) => {
        if (playing) {
          if (!intervalId) {
            intervalId = window.setInterval(() => {
              if (!usesVideoTime.value && sharedState.startTime) {
                updateTimeFromSource();
              }
            }, 10);
          }
        } else if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      },
      { immediate: true },
    );

    let lastObsBroadcast = 0;
    let obsBroadcastTimer: number | null = null;
    const OBS_THROTTLE_MS = 100;

    const broadcastObservationState = () => {
      windowSync.broadcast('state:observation', {
        isPlaying: sharedState.isPlaying,
        startTime: sharedState.startTime,
        elapsedTime: sharedState.elapsedTime,
        currentDate: sharedState.currentDate
          ? sharedState.currentDate.toISOString()
          : null,
      });
    };

    const scheduleObservationBroadcast = () => {
      const now = Date.now();
      const elapsed = now - lastObsBroadcast;
      if (elapsed >= OBS_THROTTLE_MS) {
        lastObsBroadcast = now;
        broadcastObservationState();
      } else if (obsBroadcastTimer === null) {
        obsBroadcastTimer = window.setTimeout(() => {
          obsBroadcastTimer = null;
          lastObsBroadcast = Date.now();
          broadcastObservationState();
        }, OBS_THROTTLE_MS - elapsed);
      }
    };

    watch(
      () => [sharedState.isPlaying, sharedState.startTime] as const,
      () => {
        if (windowSync.isApplyingRemote()) return;
        lastObsBroadcast = Date.now();
        if (obsBroadcastTimer !== null) {
          clearTimeout(obsBroadcastTimer);
          obsBroadcastTimer = null;
        }
        broadcastObservationState();
      },
    );

    watch(
      () => [sharedState.elapsedTime, sharedState.currentDate] as const,
      () => {
        if (windowSync.isApplyingRemote()) return;
        if (!usesVideoTime.value) return;
        scheduleObservationBroadcast();
      },
    );

    watch(
      () => [
        sharedState.currentObservation?.id,
        sharedState.currentObservation?.name,
        sharedState.currentObservation?.description,
        sharedState.currentObservation?.videoPath,
        sharedState.currentObservation?.mode,
        sharedState.currentObservation?.meta,
      ] as const,
      () => {
        if (windowSync.isApplyingRemote()) return;
        if (!sharedState.currentObservation?.id) return;
        if (!windowSync.isOwner && !followerObservationMetaHydrated) return;
        broadcastObservationMeta();
      },
    );

    windowSync.on('state:observation', (payload: Record<string, unknown>) => {
      if (!payload) return;
      windowSync.applyRemote(() => {
        sharedState.isPlaying = !!payload.isPlaying;
        sharedState.startTime =
          typeof payload.startTime === 'number' ? payload.startTime : null;

        const applyTime = usesVideoTime.value || !sharedState.isPlaying;
        if (applyTime) {
          if (typeof payload.elapsedTime === 'number') {
            sharedState.elapsedTime = payload.elapsedTime;
          }
          if ('currentDate' in payload) {
            sharedState.currentDate = payload.currentDate
              ? new Date(payload.currentDate as string)
              : null;
          }
        }
      });
    });

    windowSync.on('state:observation-meta', (payload: unknown) => {
      if (!isObservationMetaPayload(payload)) return;
      if (!windowSync.isOwner) followerObservationMetaHydrated = true;
      windowSync.applyRemote(() => {
        applyObservationMeta(payload);
      });
    });

    windowSync.on('event:video-reading-active', (payload) => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(
        new CustomEvent('video-reading-active', { detail: payload }),
      );
    });

    windowSync.on('hydrate:request', () => {
      if (!windowSync.isOwner) return;
      broadcastObservationState();
      broadcastObservationMeta();
    });
  }

  return {
    sharedState,
    methods,
    protocol,
    readings,
    timerMethods,
    chronometerMethods,
    duration,
    isActive,
    isChronometerMode,
    updateTimeFromSource,
  };
};
