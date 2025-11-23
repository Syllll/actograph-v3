import { reactive, ref, computed } from 'vue';
import {
  IObservation,
  IProtocol,
  IReading,
  ObservationModeEnum,
} from '@services/observations/interface';
import { observationService } from '@services/observations/index.service';
import { readingService } from '@services/observations/reading.service';
import { protocolService } from '@services/observations/protocol.service';
import { useProtocol } from './use-protocol';
import { useReadings } from './use-readings';
import { useDuration } from '../use-duration';
import { CHRONOMETER_T0 } from '@utils/chronometer.constants';

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

  // Duration composable
  const duration = useDuration();

  // Timer related computed properties
  const isActive = computed(() => sharedState.isPlaying || sharedState.elapsedTime > 0);

  // Chronometer mode computed property
  const isChronometerMode = computed(() => {
    return sharedState.currentObservation?.mode === ObservationModeEnum.Chronometer;
  });

  /**
   * Détermine si on utilise le temps vidéo comme source de vérité pour elapsedTime
   * En mode chronomètre avec vidéo, le VideoPlayer gère elapsedTime
   */
  const usesVideoTime = computed(() => {
    return isChronometerMode.value && !!sharedState.currentObservation?.videoPath;
  });

  /**
   * Met à jour elapsedTime et currentDate depuis la source appropriée
   * Cette méthode unifie la gestion du temps pour éviter les conflits
   * 
   * @param videoTime - Temps vidéo en secondes (optionnel)
   *                    - Si fourni ET qu'on est en mode chronomètre avec vidéo : utilise ce temps
   *                    - Si non fourni ET qu'on est en mode vidéo : ne fait rien (le temps vidéo est géré par handleTimeUpdate)
   *                    - Si non fourni ET qu'on n'est PAS en mode vidéo : calcule depuis startTime
   */
  const updateTimeFromSource = (videoTime?: number) => {
    // Cas 1 : Mode chronomètre avec vidéo ET temps vidéo fourni
    // C'est le cas quand VideoPlayer appelle cette méthode avec le temps actuel
    if (usesVideoTime.value && videoTime !== undefined) {
      sharedState.elapsedTime = videoTime;
      const t0 = chronometerMethods.getT0();
      const elapsedMs = videoTime * 1000;
      sharedState.currentDate = new Date(t0.getTime() + elapsedMs);
      return;
    }
    
    // Cas 2 : Mode normal (sans vidéo) ET timer démarré
    // C'est le cas quand le timer interne appelle cette méthode sans paramètre
    if (!usesVideoTime.value && sharedState.startTime) {
      sharedState.elapsedTime = (Date.now() - sharedState.startTime) / 1000;
      
      // Update currentDate based on mode
      if (isChronometerMode.value) {
        const t0 = chronometerMethods.getT0();
        const elapsedMs = sharedState.elapsedTime * 1000;
        sharedState.currentDate = new Date(t0.getTime() + elapsedMs);
      } else {
        sharedState.currentDate = new Date(sharedState.startTime + sharedState.elapsedTime * 1000);
      }
      return;
    }
    
    // Cas 3 : Mode vidéo mais pas de temps fourni
    // Le timer appelle cette méthode mais on est en mode vidéo
    // On ne fait rien car le temps est géré par handleTimeUpdate du VideoPlayer
    // C'est le comportement attendu pour éviter les conflits
  };

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
        // In chronometer mode, use t0 + elapsedTime
        if (isChronometerMode.value) {
          const t0 = chronometerMethods.getT0();
          const elapsedMs = sharedState.elapsedTime * 1000;
          sharedState.currentDate = new Date(t0.getTime() + elapsedMs);
        } else {
        sharedState.currentDate = new Date();
        }
      }
      
      sharedState.startTime = now - sharedState.elapsedTime * 1000;
      sharedState.isPlaying = true;
      

      intervalId = window.setInterval(() => {
        if (sharedState.startTime) {
          // Utiliser la méthode unifiée pour mettre à jour le temps
          // Si on est en mode vidéo, cette méthode ne fera rien (videoTime non fourni)
          // Sinon, elle calculera depuis startTime
          updateTimeFromSource();
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

  // Chronometer methods
  const chronometerMethods = {
    /**
     * Retourne la date de référence (t0) pour le mode chronomètre.
     * 
     * Cette méthode retourne la constante CHRONOMETER_T0 définie dans
     * @utils/chronometer.constants.ts (9 février 1989 à 00:00:00.000 UTC).
     * 
     * @returns Date de référence t0 pour les calculs de durée en mode chronomètre
     */
    getT0: (): Date => {
      return CHRONOMETER_T0;
    },

    /**
     * Convertit une date en durée (millisecondes) depuis t0.
     * 
     * Cette méthode calcule la différence entre la date fournie et la date de référence
     * CHRONOMETER_T0 (définie dans @utils/chronometer.constants.ts).
     * 
     * @param date - Date à convertir en durée
     * @returns Durée en millisecondes depuis t0
     * @throws Error si on n'est pas en mode chronomètre
     */
    dateToDuration: (date: Date): number => {
      if (!isChronometerMode.value) {
        throw new Error('Cannot convert date to duration: not in chronometer mode');
      }
      return duration.dateToDuration(date, CHRONOMETER_T0);
    },

    /**
     * Convertit une durée (millisecondes) en date en l'ajoutant à t0.
     * 
     * Cette méthode ajoute la durée fournie à la date de référence CHRONOMETER_T0
     * (définie dans @utils/chronometer.constants.ts) pour obtenir une date absolue.
     * 
     * @param milliseconds - Durée en millisecondes depuis t0
     * @returns Date correspondant à t0 + durée
     * @throws Error si on n'est pas en mode chronomètre
     */
    durationToDate: (milliseconds: number): Date => {
      if (!isChronometerMode.value) {
        throw new Error('Cannot convert duration to date: not in chronometer mode');
      }
      return duration.durationToDate(milliseconds, CHRONOMETER_T0);
    },

    /**
     * Formate une date comme une chaîne de durée (format compact).
     * 
     * Cette méthode calcule la durée entre la date fournie et la date de référence
     * CHRONOMETER_T0 (définie dans @utils/chronometer.constants.ts), puis formate
     * cette durée au format compact (ex: "2j 3h 15m 30s 500ms").
     * 
     * @param date - Date à formater comme durée
     * @returns Chaîne de durée formatée (format compact)
     * @throws Error si on n'est pas en mode chronomètre
     */
    formatDateAsDuration: (date: Date): string => {
      if (!isChronometerMode.value) {
        throw new Error('Cannot format date as duration: not in chronometer mode');
      }
      return duration.formatFromDate(date, CHRONOMETER_T0);
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
    createObservation: async (options: {
      name: string;
      description?: string;
      videoPath?: string;
      mode?: ObservationModeEnum;
    }) => {
      const response = await observationService.create(options);
      
      // Load the full observation (with readings and protocol)
      // The response from create might not have all relations loaded
      await methods.loadObservation(response.id);
    },
    updateObservation: async (id: number, updateData: {
      name?: string;
      description?: string;
      videoPath?: string;
      mode?: ObservationModeEnum;
    }) => {
      const response = await observationService.update(id, updateData);
      // Reload the observation to get updated data
      await methods.loadObservation(id);
      return response;
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
    chronometerMethods,
    duration,
    isActive,
    isChronometerMode,
    // Méthode unifiée pour mettre à jour le temps depuis n'importe quelle source
    // (VideoPlayer ou timer interne)
    updateTimeFromSource,
  };
};
