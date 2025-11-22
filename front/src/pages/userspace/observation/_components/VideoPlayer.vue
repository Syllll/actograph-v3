<template>
  <!-- No video message (shown when in chronometer mode but no videoPath in observation) -->
  <!-- If videoPath exists, show video container (even if loading) -->
  <div v-if="observation.isChronometerMode.value && !observation.sharedState.currentObservation?.videoPath" class="no-video-message column items-center justify-center q-pa-lg">
    <q-icon name="videocam_off" size="48px" color="grey-6" />
    <div class="text-h6 q-mt-md text-grey-6">Aucune vidéo chargée</div>
    <div class="text-caption q-mt-xs text-grey-6">En mode chronomètre, vous pouvez analyser une vidéo enregistrée</div>
    <q-btn
      label="Sélectionner une vidéo"
      color="primary"
      icon="videocam"
      @click="methods.selectVideoFile"
      class="q-mt-md"
    />
  </div>
  
  <!-- Video player container (shown when video is loaded or when videoPath exists) -->
  <div v-else class="video-player-container column">
    <!-- Video container -->
    <div class="video-wrapper col">
      <video
        ref="videoRef"
        :src="videoSrc"
        class="video-element"
        :controls="false"
        @loadedmetadata="methods.handleVideoLoaded"
        @timeupdate="methods.handleTimeUpdate"
        @play="methods.handlePlay"
        @pause="methods.handlePause"
        @ended="methods.handleEnded"
        @error="methods.handleVideoError"
        @loadstart="state.isLoading = true"
      >
        Votre navigateur ne supporte pas la lecture de vidéos.
      </video>
      
              <!-- Error message overlay -->
              <div v-if="state.videoError" class="video-error-overlay column items-center justify-center q-pa-lg">
                <q-icon name="error_outline" size="48px" color="negative" />
                <div class="text-h6 q-mt-md text-center">{{ state.videoError }}</div>
                <div v-if="state.currentVideoPath" class="text-caption text-grey-6 q-mt-xs text-center">
                  Fichier attendu : {{ getFileName(state.currentVideoPath) }}
                </div>
                <q-btn
                  label="Sélectionner un nouveau fichier"
                  color="primary"
                  @click="methods.selectVideoFile"
                  class="q-mt-md"
                />
              </div>
      
      <!-- Loading indicator -->
      <div v-if="state.isLoading && !state.videoError" class="video-loading-overlay column items-center justify-center">
        <q-spinner color="primary" size="48px" />
        <div class="text-subtitle1 q-mt-md">Chargement de la vidéo...</div>
      </div>
      
      <!-- Custom timeline with notches - Unique clickable timeline -->
      <div class="timeline-container" @click="handleTimelineClick">
        <div class="timeline-track">
          <div
            class="timeline-progress"
            :style="{ width: `${state.progressPercent}%` }"
          ></div>
          <!-- Notches for each reading -->
          <div
            v-for="(reading, index) in readings.sharedState.currentReadings"
            :key="reading.id || reading.tempId || index"
            class="timeline-notch"
            :style="{ left: `${getNotchPosition(reading)}%` }"
            :title="getNotchTooltip(reading)"
            @click.stop="handleNotchClick(reading)"
          ></div>
        </div>
      </div>
    </div>

    <!-- Controls bar -->
    <div class="video-controls col-auto">
      <div class="row items-center q-pa-sm q-gutter-md">
        <!-- Play/Pause button -->
        <q-btn
          round
          dense
          :icon="state.isPlaying ? 'pause' : 'play_arrow'"
          @click="togglePlayPause"
          color="primary"
          size="sm"
        />
        
        <!-- Volume controls -->
        <div class="row items-center q-gutter-xs">
          <q-icon name="volume_up" size="sm" />
          <q-slider
            v-model="state.volume"
            :min="0"
            :max="100"
            style="width: 80px"
            dense
            @update:model-value="handleVolumeChange"
          />
        </div>
        
        <!-- Playback speed control -->
        <q-select
          v-model="state.playbackRate"
          :options="playbackSpeeds"
          option-label="label"
          emit-value
          map-options
          dense
          outlined
          style="min-width: 70px"
          @update:model-value="methods.handlePlaybackRateChange"
        >
          <template v-slot:selected>
            <span class="text-caption">{{ state.playbackRate }}x</span>
          </template>
        </q-select>
        
        <!-- Mode toggle -->
        <ModeToggle
          v-if="canChangeMode"
          :current-mode="currentMode"
          :can-change-mode="canChangeMode"
          @mode-change="handleModeChange"
        />
        
        <!-- Time display -->
        <div class="row items-center q-gutter-xs">
          <span class="text-caption">{{ formatTime(state.currentTime) }}</span>
          <span class="text-caption">/</span>
          <span class="text-caption">{{ formatTime(state.duration) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { IReading, ObservationModeEnum, ReadingTypeEnum } from '@services/observations/interface';
import { useQuasar } from 'quasar';
import ModeToggle from './ModeToggle.vue';

export default defineComponent({
  name: 'VideoPlayer',

  components: {
    ModeToggle,
  },

  setup() {
    const $q = useQuasar();
    const observation = useObservation();
    const { sharedState: readingsState, methods: readingsMethods } = observation.readings;
    const videoRef = ref<HTMLVideoElement | null>(null);

    /**
     * État réactif du lecteur vidéo
     * 
     * - isPlaying : Indique si la vidéo est en cours de lecture
     * - currentTime : Temps actuel de la vidéo en secondes
     * - duration : Durée totale de la vidéo en secondes
     * - volume : Volume de la vidéo (0-100)
     * - playbackRate : Vitesse de lecture (1.0 = vitesse normale)
     * - progressPercent : Pourcentage de progression (0-100) pour la barre de progression
     * - videoError : Message d'erreur si le chargement échoue
     * - isLoading : Indicateur de chargement de la vidéo
     */
    const state = reactive({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 100,
      playbackRate: 1.0, // Normal speed (1x)
      progressPercent: 0,
      videoError: null as string | null,
      isLoading: false,
      currentVideoPath: null as string | null, // Stocke le chemin actuel pour afficher le nom du fichier en cas d'erreur
    });

    // Available playback speeds
    const playbackSpeeds = [
      { label: '0.25x', value: 0.25 },
      { label: '0.5x', value: 0.5 },
      { label: '0.75x', value: 0.75 },
      { label: '1x', value: 1.0 },
      { label: '1.25x', value: 1.25 },
      { label: '1.5x', value: 1.5 },
      { label: '1.75x', value: 1.75 },
      { label: '2x', value: 2.0 },
    ];

    // Video source URL (reactive)
    const videoSrc = ref<string>('');

    /**
     * Convertit un chemin de fichier en URL file:// pour Electron
     * 
     * Cette fonction est nécessaire car Electron nécessite des URLs file:// pour
     * charger des fichiers locaux dans le renderer process. Le protocole file://
     * permet au navigateur de streamer la vidéo directement depuis le disque sans
     * charger tout le fichier en mémoire (optimisation majeure pour les gros fichiers).
     * 
     * @param filePath - Chemin absolu du fichier (ex: "C:/Videos/démo1.mp4" ou "/home/user/video.mp4")
     * @returns URL file:// encodée (ex: "file:///C%3A/Videos/d%C3%A9mo1.mp4")
     */
    const pathToFileUrl = (filePath: string): string => {
      // Normaliser les séparateurs de chemin (Windows utilise \)
      let normalizedPath = filePath.replace(/\\/g, '/');
      
      // Supprimer le slash initial pour les chemins Windows (C:/)
      if (normalizedPath.match(/^[A-Z]:/i)) {
        normalizedPath = normalizedPath.replace(/^\//, '');
      }
      
      // Encoder chaque segment du chemin pour gérer les caractères spéciaux
      // (ex: espaces, accents, caractères Unicode)
      const encodedPath = normalizedPath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
      
      return `file:///${encodedPath}`;
    };

    /**
     * Extrait le nom du fichier depuis un chemin complet
     * 
     * @param path - Chemin complet du fichier
     * @returns Nom du fichier uniquement
     */
    const getFileName = (path: string | null): string => {
      if (!path) return '';
      // Extraire le nom du fichier depuis le chemin
      const parts = path.split(/[/\\]/);
      return parts[parts.length - 1] || path;
    };

    // Format file size for display
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    // Maximum file size warning threshold (500 MB)
    const MAX_FILE_SIZE_WARNING = 500 * 1024 * 1024; // 500 MB

    /**
     * Charge un fichier vidéo en utilisant le protocole file://
     * 
     * Cette fonction utilise le protocole file:// pour charger la vidéo, ce qui permet
     * au navigateur de streamer la vidéo directement depuis le disque sans charger tout
     * le fichier en mémoire. C'est une optimisation majeure pour les gros fichiers vidéo.
     * 
     * Avant le chargement, elle vérifie :
     * - L'existence du fichier
     * - Le type de fichier (fichier vs dossier)
     * - La taille du fichier (avertissement si > 500 MB)
     * 
     * @param videoPath - Chemin absolu du fichier vidéo à charger
     */
    const loadVideoFile = async (videoPath: string) => {
      if (!videoPath) {
        videoSrc.value = '';
        state.currentVideoPath = null;
        return;
      }

      // Stocker le chemin actuel pour l'afficher en cas d'erreur
      state.currentVideoPath = videoPath;
      const fileName = getFileName(videoPath);

      try {
        state.isLoading = true;
        state.videoError = null;

        // Check file stats if Electron API is available
        if (window.api && window.api.getFileStats) {
          const statsResult = await window.api.getFileStats(videoPath);
          
          if (!statsResult.success || !statsResult.exists) {
            videoSrc.value = '';
            state.videoError = `Le fichier vidéo "${fileName}" est introuvable à l'emplacement enregistré.`;
            state.isLoading = false;
            
            // Proposer de sélectionner un nouveau fichier
            $q.notify({
              type: 'negative',
              message: 'Fichier vidéo introuvable',
              caption: `Le fichier "${fileName}" n'existe plus à l'emplacement enregistré. Veuillez sélectionner un nouveau fichier.`,
              timeout: 5000,
              actions: [
                {
                  label: 'Sélectionner un nouveau fichier',
                  handler: () => {
                    methods.selectVideoFile();
                  },
                },
              ],
            });
            return;
          }

          if (!statsResult.isFile) {
            videoSrc.value = '';
            state.videoError = `Le chemin spécifié pour "${fileName}" n'est pas un fichier`;
            state.isLoading = false;
            return;
          }

          // Warn if file is very large
          if (statsResult.size && statsResult.size > MAX_FILE_SIZE_WARNING) {
            const sizeStr = formatFileSize(statsResult.size);
            $q.notify({
              type: 'warning',
              message: `Fichier volumineux détecté (${sizeStr})`,
              caption: 'Le chargement peut prendre du temps',
              timeout: 3000,
            });
          }
        }

        // Use file:// protocol directly - allows browser to stream the video
        // This is much more efficient than loading the entire file in memory
        videoSrc.value = pathToFileUrl(videoPath);
        state.isLoading = false;
        state.videoError = null; // Réinitialiser l'erreur si le chargement réussit
      } catch (error: any) {
        videoSrc.value = '';
        state.videoError = `Erreur lors du chargement de la vidéo "${fileName}"`;
        state.isLoading = false;
        
        // Proposer de sélectionner un nouveau fichier
        $q.notify({
          type: 'negative',
          message: 'Erreur lors du chargement de la vidéo',
          caption: `Le fichier "${fileName}" est inaccessible. Veuillez sélectionner un nouveau fichier.`,
          timeout: 5000,
          actions: [
            {
              label: 'Sélectionner un nouveau fichier',
              handler: () => {
                methods.selectVideoFile();
              },
            },
          ],
        });
      }
    };

    const readings = computed(() => ({
      sharedState: readingsState,
      methods: readingsMethods,
    }));

    // Methods
    const methods = {
      selectVideoFile: async () => {
        // Check if Electron API is available
        if (!window.api || !window.api.showOpenDialog) {
          $q.notify({
            type: 'negative',
            message: 'L\'API Electron n\'est pas disponible. Cette fonctionnalité nécessite Electron.',
          });
          return;
        }

        try {
          const dialogResult = await window.api.showOpenDialog({
            filters: [
              { name: 'Fichiers vidéo', extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi'] },
              { name: 'Tous les fichiers', extensions: ['*'] },
            ],
          });

          if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
            return;
          }

          const filePath = dialogResult.filePaths[0];

          // Update observation with video path
          if (observation.sharedState.currentObservation?.id) {
            await observation.methods.updateObservation(
              observation.sharedState.currentObservation.id,
              { videoPath: filePath }
            );
          }
        } catch (error: any) {
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la sélection de la vidéo',
            caption: error.message,
          });
        }
      },

      handleVideoLoaded: () => {
        if (videoRef.value) {
          state.duration = videoRef.value.duration;
          state.videoError = null;
          state.isLoading = false;
          // Set initial playback rate
          videoRef.value.playbackRate = state.playbackRate;
        }
      },

      handleVideoError: () => {
        const fileName = state.currentVideoPath ? getFileName(state.currentVideoPath) : 'le fichier vidéo';
        state.videoError = `Impossible de charger la vidéo "${fileName}". Le fichier n'existe peut-être plus.`;
        state.isLoading = false;
        $q.notify({
          type: 'negative',
          message: 'Erreur de chargement de la vidéo',
          caption: `Le fichier "${fileName}" est introuvable ou inaccessible. Veuillez sélectionner un nouveau fichier.`,
          timeout: 5000,
          actions: [
            {
              label: 'Sélectionner un nouveau fichier',
              handler: () => {
                methods.selectVideoFile();
              },
            },
          ],
        });
      },

      /**
       * Gère la mise à jour du temps de la vidéo
       * 
       * Cette fonction est appelée automatiquement par l'élément <video> à chaque
       * frame pendant la lecture. Elle :
       * 1. Met à jour le temps actuel et le pourcentage de progression
       * 2. Synchronise le temps avec l'observation en mode chronomètre
       * 3. Active les boutons correspondants aux relevés à l'instant t
       * 
       * En mode chronomètre, le temps vidéo est synchronisé avec elapsedTime de
       * l'observation, permettant de créer des relevés synchronisés avec la vidéo.
       */
      handleTimeUpdate: () => {
        if (videoRef.value) {
          state.currentTime = videoRef.value.currentTime;
          if (state.duration > 0) {
            state.progressPercent = (state.currentTime / state.duration) * 100;
          }
          
          // Synchroniser avec elapsedTime de l'observation en mode chronomètre
          if (observation.isChronometerMode.value) {
            // Mettre à jour elapsedTime basé sur le temps vidéo actuel
            observation.sharedState.elapsedTime = state.currentTime;
            
            // Trouver le relevé à l'instant t et activer le bouton correspondant
            // Utilisation de requestAnimationFrame pour optimiser les performances
            // (synchronisation avec le cycle de rendu du navigateur)
            if (state.isPlaying) {
              requestAnimationFrame(() => {
                methods.activateButtonForCurrentReading();
              });
            }
          }
        }
      },

      /**
       * Active automatiquement les boutons selon la position actuelle de la vidéo
       * 
       * Cette fonction détermine quels boutons doivent être activés en fonction du
       * temps actuel de la vidéo. Elle respecte la logique des observables continus :
       * - Un observable reste actif jusqu'à ce qu'un autre observable de la même catégorie soit activé
       * - Si on se positionne entre deux relevés, le dernier relevé avant cet instant reste actif
       * 
       * Algorithme :
       * 1. Convertit le temps vidéo en temps absolu (t0 + temps vidéo)
       * 2. Pour chaque catégorie continue :
       *    - Trouve le dernier relevé avant ou à l'instant t
       *    - Active le bouton correspondant à l'observable de ce relevé
       * 3. Émet un événement personnalisé avec les boutons actifs par catégorie
       * 
       * Cette fonction est appelée :
       * - Pendant la lecture vidéo (via handleTimeUpdate)
       * - Lors du clic sur la timeline
       * - Lors du clic sur une encoche
       */
      activateButtonForCurrentReading: () => {
        if (!observation.isChronometerMode.value || !videoRef.value) return;
        
        // Convertir le temps vidéo (secondes) en millisecondes
        const currentVideoTime = state.currentTime * 1000;
        const t0 = observation.chronometerMethods.getT0();
        const t0Time = t0.getTime();
        const currentReadingTime = t0Time + currentVideoTime;
        
        const currentReadings = readingsState.currentReadings;
        const protocol = observation.protocol.sharedState.currentProtocol;
        
        if (!protocol || !protocol._items) return;
        
        // Récupérer toutes les catégories continues (seules celles-ci nécessitent une activation)
        const categories = protocol._items.filter(
          (item: any) => item.type === 'category' && item.action === 'continuous' && item.id
        );
        
        // Pour chaque catégorie, trouver le dernier relevé avant ou à l'instant t
        const activeReadingsByCategory: Record<string, IReading | null> = {};
        
        for (const category of categories) {
          if (!category.children) continue;
          
          let lastReading: IReading | null = null;
          let lastReadingTime = -1;
          
          // Pour chaque observable de cette catégorie
          for (const observable of category.children) {
            // Trouver tous les relevés avec cet observable
            const observableReadings = currentReadings.filter(
              (reading) => reading.name === observable.name
            );
            
            // Find the most recent reading before or at current time
            for (const reading of observableReadings) {
              // Ensure dateTime is a Date object
              const readingDate = reading.dateTime instanceof Date 
                ? reading.dateTime 
                : new Date(reading.dateTime);
              const readingTime = readingDate.getTime();
              
              // If reading is before or at current time and more recent than last found
              if (readingTime <= currentReadingTime && readingTime > lastReadingTime) {
                lastReading = reading;
                lastReadingTime = readingTime;
              }
            }
          }
          
          // Store the last reading for this category
          const categoryId = (category as any).id;
          if (categoryId) {
            activeReadingsByCategory[categoryId] = lastReading;
          }
        }
        
        // Emit event with all active readings by category
        window.dispatchEvent(new CustomEvent('video-reading-active', {
          detail: { readingsByCategory: activeReadingsByCategory }
        }));
      },

      handlePlay: () => {
        state.isPlaying = true;
        // Start observation timer if not already started
        if (!observation.sharedState.isPlaying) {
          observation.timerMethods.startTimer();
        }
      },

      handlePause: () => {
        state.isPlaying = false;
        // Pause observation timer
        if (observation.sharedState.isPlaying) {
          observation.timerMethods.pauseTimer();
        }
      },

      handleEnded: () => {
        state.isPlaying = false;
        // Stop observation timer
        observation.timerMethods.stopTimer();
      },

      togglePlayPause: () => {
        if (videoRef.value) {
          if (state.isPlaying) {
            videoRef.value.pause();
          } else {
            videoRef.value.play();
          }
        }
      },

      handleVolumeChange: (value: number) => {
        if (videoRef.value) {
          videoRef.value.volume = value / 100;
        }
      },

      handlePlaybackRateChange: (rate: number) => {
        if (videoRef.value) {
          videoRef.value.playbackRate = rate;
          state.playbackRate = rate;
        }
      },

      handleTimelineClick: (event: MouseEvent) => {
        if (!videoRef.value || !state.duration) return;
        
        const timeline = event.currentTarget as HTMLElement;
        const rect = timeline.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percent = clickX / rect.width;
        const newTime = percent * state.duration;
        
        videoRef.value.currentTime = newTime;
        state.currentTime = newTime;
        
        // Update buttons position based on new time
        if (observation.isChronometerMode.value) {
          methods.activateButtonForCurrentReading();
        }
      },

      getNotchPosition: (reading: IReading): number => {
        if (!observation.isChronometerMode.value || !state.duration) return 0;
        
        // Ensure dateTime is a Date object
        const readingDate = reading.dateTime instanceof Date 
          ? reading.dateTime 
          : new Date(reading.dateTime);
        
        // Calculate position based on reading dateTime relative to t0
        const t0 = observation.chronometerMethods.getT0();
        const readingTime = readingDate.getTime();
        const t0Time = t0.getTime();
        const durationMs = state.duration * 1000;
        
        // If reading is before t0, position at 0%
        if (readingTime < t0Time) return 0;
        
        // Calculate position as percentage
        const readingDuration = readingTime - t0Time;
        const position = (readingDuration / durationMs) * 100;
        
        return Math.min(100, Math.max(0, position));
      },

      getNotchTooltip: (reading: IReading): string => {
        // Ensure dateTime is a Date object
        const readingDate = reading.dateTime instanceof Date 
          ? reading.dateTime 
          : new Date(reading.dateTime);
        
        if (observation.isChronometerMode.value) {
          return observation.chronometerMethods.formatDateAsDuration(readingDate);
        }
        return readingDate.toLocaleString();
      },

      handleNotchClick: (reading: IReading) => {
        if (!videoRef.value || !state.duration) return;
        
        // Ensure dateTime is a Date object
        const readingDate = reading.dateTime instanceof Date 
          ? reading.dateTime 
          : new Date(reading.dateTime);
        
        if (observation.isChronometerMode.value) {
          // Calculate time based on duration from t0
          const t0 = observation.chronometerMethods.getT0();
          const readingTime = readingDate.getTime();
          const t0Time = t0.getTime();
          const durationMs = state.duration * 1000;
          
          if (readingTime >= t0Time) {
            const readingDuration = readingTime - t0Time;
            const videoTime = readingDuration / 1000; // Convert to seconds
            
            if (videoTime >= 0 && videoTime <= state.duration) {
              videoRef.value.currentTime = videoTime;
              state.currentTime = videoTime;
              
              // Update buttons position based on new time
              methods.activateButtonForCurrentReading();
            }
          }
        }
      },

      formatTime: (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      },
    };

    // Watch for video path changes to reload video
    // IMPORTANT: Ce watcher charge automatiquement la vidéo quand :
    // 1. Le composant est monté (immediate: true)
    // 2. Le videoPath change dans l'observation
    // 3. L'observation est chargée après le montage du composant
    const stopVideoPathWatcher = watch(
      () => observation.sharedState.currentObservation?.videoPath,
      async (newPath, oldPath) => {
        console.log('[VideoPlayer] videoPath watcher triggered:', {
          newPath,
          oldPath,
          currentVideoSrc: videoSrc.value,
          currentVideoPath: state.currentVideoPath,
          observation: observation.sharedState.currentObservation,
        });
        
        // Charger la vidéo si :
        // - Un nouveau videoPath est défini
        // - Le videoPath a changé depuis la dernière fois
        // - La vidéo n'est pas encore chargée (videoSrc vide ou currentVideoPath différent)
        if (newPath) {
          const shouldLoad = !oldPath || 
            oldPath !== newPath || 
            !videoSrc.value || 
            videoSrc.value === '' ||
            state.currentVideoPath !== newPath;
          
          console.log('[VideoPlayer] Should load video?', shouldLoad);
          
          if (shouldLoad) {
            console.log('[VideoPlayer] Loading video file:', newPath);
            await loadVideoFile(newPath);
            // Wait a bit for the URL to be set, then load the video
            if (videoRef.value) {
              videoRef.value.load();
            }
          }
        } else {
          // Si videoPath est supprimé, vider la source
          console.log('[VideoPlayer] No videoPath, clearing video source');
          videoSrc.value = '';
          state.currentVideoPath = null;
        }
      },
      { immediate: true }
    );

    // Watch for observation changes to ensure video loads when observation is loaded
    // This handles the case where the component mounts before the observation is loaded
    // or when navigating to the observation page with an observation that has a videoPath
    const stopObservationWatcher = watch(
      () => observation.sharedState.currentObservation,
      async (newObservation, oldObservation) => {
        console.log('[VideoPlayer] observation watcher triggered:', {
          newObservation: newObservation ? {
            id: newObservation.id,
            name: newObservation.name,
            videoPath: newObservation.videoPath,
            mode: newObservation.mode,
          } : null,
          oldObservation: oldObservation ? {
            id: oldObservation.id,
            videoPath: oldObservation.videoPath,
          } : null,
          currentVideoSrc: videoSrc.value,
          currentVideoPath: state.currentVideoPath,
        });
        
        // Charger la vidéo si :
        // 1. Une nouvelle observation est chargée avec un videoPath
        // 2. L'observation change (même si elle avait déjà un videoPath)
        // 3. Le videoPath change entre deux observations
        // 4. La vidéo n'est pas encore chargée (videoSrc vide ou différent du videoPath actuel)
        if (newObservation?.videoPath) {
          const currentVideoPath = state.currentVideoPath;
          const videoPathChanged = !oldObservation || 
            oldObservation.videoPath !== newObservation.videoPath ||
            !videoSrc.value ||
            videoSrc.value === '' ||
            currentVideoPath !== newObservation.videoPath;
          
          console.log('[VideoPlayer] Observation has videoPath, should load?', videoPathChanged);
          
          if (videoPathChanged) {
            console.log('[VideoPlayer] Loading video from observation watcher:', newObservation.videoPath);
            // L'observation vient d'être chargée et contient un videoPath
            // ou le videoPath a changé
            await loadVideoFile(newObservation.videoPath);
            if (videoRef.value) {
              videoRef.value.load();
            }
          }
        } else if (oldObservation?.videoPath && !newObservation?.videoPath) {
          // Si l'observation n'a plus de videoPath, vider la source
          console.log('[VideoPlayer] Observation no longer has videoPath, clearing');
          videoSrc.value = '';
          state.currentVideoPath = null;
        } else if (!newObservation?.videoPath) {
          console.log('[VideoPlayer] Observation has no videoPath');
        }
      },
      { immediate: true }
    );

    // Watch for readings changes to update notches
    const stopReadingsWatcher = watch(
      () => readingsState.currentReadings,
      () => {
        // Notches will update automatically via computed properties
        // Also update buttons position when readings change
        if (observation.isChronometerMode.value && videoRef.value) {
          methods.activateButtonForCurrentReading();
        }
      },
      { deep: true }
    );

    // Force load video on mount if observation already has videoPath
    // This handles the case where user navigates to observation page
    // with an observation that was just created or already loaded
    // IMPORTANT: This is a fallback in case watchers don't trigger correctly
    onMounted(async () => {
      console.log('[VideoPlayer] Component mounted, checking for video:', {
        currentObservation: observation.sharedState.currentObservation ? {
          id: observation.sharedState.currentObservation.id,
          name: observation.sharedState.currentObservation.name,
          videoPath: observation.sharedState.currentObservation.videoPath,
          mode: observation.sharedState.currentObservation.mode,
        } : null,
        currentVideoSrc: videoSrc.value,
        currentVideoPath: state.currentVideoPath,
        isChronometerMode: observation.isChronometerMode.value,
      });
      
      // Wait a bit to ensure all watchers have run first
      // This gives watchers a chance to load the video automatically
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const currentObs = observation.sharedState.currentObservation;
      const currentVideoPath = state.currentVideoPath;
      
      console.log('[VideoPlayer] After watchers delay, checking again:', {
        currentObs: currentObs ? {
          id: currentObs.id,
          videoPath: currentObs.videoPath,
        } : null,
        currentVideoSrc: videoSrc.value,
        currentVideoPath: state.currentVideoPath,
      });
      
      // Load video if:
      // 1. Observation has videoPath
      // 2. Video hasn't been loaded yet (videoSrc is empty or currentVideoPath doesn't match)
      // This is a safety check to ensure video loads even if watchers didn't trigger
      if (currentObs?.videoPath && 
          (!videoSrc.value || 
           videoSrc.value === '' || 
           currentVideoPath !== currentObs.videoPath)) {
        console.log('[VideoPlayer] Force loading video on mount:', currentObs.videoPath);
        // Observation is already loaded with videoPath but video hasn't been loaded yet
        await loadVideoFile(currentObs.videoPath);
        if (videoRef.value) {
          videoRef.value.load();
        }
      } else if (!currentObs?.videoPath) {
        console.log('[VideoPlayer] No videoPath in observation on mount');
      } else {
        console.log('[VideoPlayer] Video already loaded or matches current path');
      }
    });

    // Debounce timer for currentTime watcher
    let currentTimeDebounceTimer: number | null = null;

    // Watch for currentTime changes to update buttons position
    // This handles cases where time changes without user interaction (e.g., programmatic changes)
    const stopCurrentTimeWatcher = watch(
      () => state.currentTime,
      () => {
        if (observation.isChronometerMode.value && videoRef.value && state.isPlaying) {
          // Clear previous timer
          if (currentTimeDebounceTimer !== null) {
            clearTimeout(currentTimeDebounceTimer);
          }
          
          // Use debounce to avoid too many updates during playback
          currentTimeDebounceTimer = window.setTimeout(() => {
            methods.activateButtonForCurrentReading();
            currentTimeDebounceTimer = null;
          }, 100);
        }
      }
    );

    // Cleanup on unmount
    onUnmounted(() => {
      // Cleanup debounce timer
      if (currentTimeDebounceTimer !== null) {
        clearTimeout(currentTimeDebounceTimer);
        currentTimeDebounceTimer = null;
      }
      
      // Stop all watchers
      stopVideoPathWatcher();
      stopObservationWatcher();
      stopReadingsWatcher();
      stopCurrentTimeWatcher();
      
      // Cleanup video element
      if (videoRef.value) {
        try {
          videoRef.value.pause();
          videoRef.value.src = '';
          videoRef.value.load();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      
      // Clear video source URL to free memory (only for blob URLs)
      if (videoSrc.value && videoSrc.value.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(videoSrc.value);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    });

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

    const handleModeChange = (mode: ObservationModeEnum) => {
      // Mode change is handled by ModeToggle component
      // This handler is here for potential future use
    };

    return {
      observation,
      readings,
      videoRef,
      state,
      videoSrc,
      playbackSpeeds,
      currentMode,
      canChangeMode,
      methods,
      handleModeChange,
      getFileName, // Exposer pour le template
      // Expose methods used in template
      getNotchPosition: methods.getNotchPosition,
      getNotchTooltip: methods.getNotchTooltip,
      handleNotchClick: methods.handleNotchClick,
      handleTimelineClick: methods.handleTimelineClick,
      togglePlayPause: methods.togglePlayPause,
      handleVolumeChange: methods.handleVolumeChange,
      formatTime: methods.formatTime,
    };
  },
});
</script>

<style scoped>
.video-player-container {
  background-color: var(--background);
  border-bottom: 1px solid var(--separator);
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.video-wrapper {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background-color: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  min-height: 0;
}

/* Hide native browser controls completely */
.video-element::-webkit-media-controls {
  display: none !important;
}

.video-element::-webkit-media-controls-enclosure {
  display: none !important;
}

.video-element::-webkit-media-controls-panel {
  display: none !important;
}

.video-element::-webkit-media-controls-play-button {
  display: none !important;
}

.video-element::-webkit-media-controls-timeline {
  display: none !important;
}

.video-element::-webkit-media-controls-current-time-display {
  display: none !important;
}

.video-element::-webkit-media-controls-time-remaining-display {
  display: none !important;
}

.video-element::-webkit-media-controls-mute-button {
  display: none !important;
}

.video-element::-webkit-media-controls-volume-slider {
  display: none !important;
}

.timeline-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  padding: 0 8px;
  z-index: 5;
}

.timeline-track {
  position: relative;
  width: 100%;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: var(--primary);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.timeline-notch {
  position: absolute;
  top: -6px;
  width: 2px;
  height: 16px;
  background-color: var(--accent);
  cursor: pointer;
  z-index: 10;
  transition: background-color 0.2s, width 0.2s;
}

.timeline-notch:hover {
  background-color: var(--primary);
  width: 3px;
}

.video-controls {
  background-color: rgba(255, 255, 255, 0.95);
  border-top: 1px solid var(--separator);
  flex: 0 0 auto;
}

.video-controls .q-slider {
  margin: 0;
  padding: 0;
  max-width: 80px;
  flex-shrink: 0;
}

.no-video-message {
  background-color: var(--background);
  border-bottom: 1px solid var(--separator);
  overflow: hidden;
  flex: 1;
  min-height: 200px;
}

.video-error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 10;
  padding: 20px;
}

.video-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 5;
}
</style>

