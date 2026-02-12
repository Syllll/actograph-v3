/**
 * Use Readings Composable
 * 
 * This composable manages the loading, editing, and synchronization of readings
 * associated with an observation. It maintains both the initial state and 
 * current state of readings to track changes for synchronization.
 */

import { IReading, IObservation, ReadingTypeEnum } from '@services/observations/interface';
import { reactive } from 'vue';
import { readingService } from '@services/observations/reading.service';
import { v4 as uuidv4 } from 'uuid';
import { CHRONOMETER_T0 } from '@utils/chronometer.constants';
import { autoCorrectReadings as coreAutoCorrectReadings } from '@actograph/core';

// Stateless object to store the initial readings (used for comparison during sync)
const stateless = {
  initialReadings: [] as IReading[],
}

// Reactive state that can be shared across component instances
const sharedState = reactive({
  currentReadings: [] as IReading[],
  selectedReading: null as IReading | null,
});

// Ensure we do not run multiple synchronization loops or overlapping syncs
let isSyncInFlight = false;
let hasStartedSyncLoop = false;
let syncTimeoutId: number | null = null;

export const useReadings = (options: {
  sharedStateFromObservation: any,
}) => {
  const observationSharedState = options.sharedStateFromObservation;
  
  const methods = {
    /**
     * Loads all readings associated with the provided observation
     * 
     * @param observation - The observation whose readings should be loaded
     * @returns Promise that resolves when readings are loaded
     */
    loadReadings: async (observation: IObservation) => {
      const r = await readingService.findWithPagination(
        {
          offset: 0,
          limit: 999999, // Request all readings (large limit)
          order: 'ASC',
          orderBy: 'dateTime',
        },
        {
          observationId: observation.id,
        }
      );
      const readings = r.results;
      
      // Convert dateTime strings to Date objects
      const readingsWithDates = readings.map((reading: IReading) => ({
        ...reading,
        dateTime: reading.dateTime instanceof Date ? reading.dateTime : new Date(reading.dateTime),
        createdAt: reading.createdAt instanceof Date 
          ? reading.createdAt 
          : reading.createdAt 
            ? new Date(reading.createdAt)
            : undefined,
        updatedAt: reading.updatedAt instanceof Date 
          ? reading.updatedAt 
          : reading.updatedAt 
            ? new Date(reading.updatedAt)
            : undefined,
      }));
      
      // Deep copy to ensure initialReadings is independent from currentReadings
      // This prevents modifications to currentReadings from affecting initialReadings
      stateless.initialReadings = readingsWithDates.map((r) => ({
        ...r,
        dateTime: new Date(r.dateTime),
        createdAt: r.createdAt instanceof Date 
          ? r.createdAt 
          : r.createdAt 
            ? new Date(r.createdAt)
            : undefined,
        updatedAt: r.updatedAt instanceof Date 
          ? r.updatedAt 
          : r.updatedAt 
            ? new Date(r.updatedAt)
            : undefined,
      }));
      sharedState.currentReadings = readingsWithDates;
    },
    
    /**
     * Synchronizes the current readings state with the backend
     * 
     * This method:
     * 1. Identifies new readings to be created
     * 2. Identifies existing readings that need updating
     * 3. Identifies readings that have been deleted
     * 4. Performs the appropriate API calls with retry logic
     * 5. Updates the initial readings state to match the current state
     * 
     * @returns Promise that resolves when synchronization is complete
     */
    synchronizeReadings: async () => {
      if (isSyncInFlight) {
        return;
      }
      isSyncInFlight = true;
      try {
      // Make a local copy of the current readings
      const currentReadings = [...sharedState.currentReadings];

      const doesReadingExistInInitialReadings = (reading: IReading) => {
        return stateless.initialReadings.some((initial) => {
          if (reading.tempId && initial.tempId && reading.tempId === initial.tempId) {
            return true;
          }
          if (reading.id && initial.id && reading.id === initial.id) {
            return true;
          }
          return false;
        });
      }

      const doesReadingExistInCurrentReadings = (reading: IReading) => {
        return currentReadings.some((current) => {
          if (reading.tempId && current.tempId && reading.tempId === current.tempId) {
            return true;
          }
          if (reading.id && current.id && reading.id === current.id) {
            return true;
          }
          return false;
        });
      }
      // Find the differences between the initial readings and the current readings:
      
      // 1. Find new readings (present in currentReadings but not in initialReadings)
      const newReadings = currentReadings.filter(
        // For each current reading, check if it has a tempId or an id
        // If it has a tempId, check if it is present in the initial readings
        // If it has an id, check if it is present in the initial readings
        (current) => !doesReadingExistInInitialReadings(current)
      );

      // 2. Find updated readings (present in both, but with property changes)
      const updatedReadings = currentReadings.filter((current) => {
        const initialReading = stateless.initialReadings.find((initial) => {
          if (current.tempId && initial.tempId && current.tempId === initial.tempId) {
            return true;
          }
          if (current.id && initial.id && current.id === initial.id) {
            return true;
          }
          return false;
        });
        if (!initialReading) {
          return false;
        }
        // Compare properties to detect changes
        // For dateTime, compare timestamps (getTime()) instead of object references
        const currentDateTime = current.dateTime instanceof Date ? current.dateTime.getTime() : new Date(current.dateTime).getTime();
        const initialDateTime = initialReading.dateTime instanceof Date ? initialReading.dateTime.getTime() : new Date(initialReading.dateTime).getTime();
        
        const hasChanged = (
          current.name !== initialReading.name ||
          current.description !== initialReading.description ||
          current.type !== initialReading.type ||
          currentDateTime !== initialDateTime
        );
        if (hasChanged) {
          console.log('Updated reading:', current);
          console.log('Initial reading:', initialReading);
          return current;
        }
        return false;
      });

      // 3. Find deleted readings (present in initialReadings but not in currentReadings)
      const deletedReadings = stateless.initialReadings.filter(
        (initial) => {
          return !doesReadingExistInCurrentReadings(initial);
        }
      );

      if (newReadings.length > 0) {
        console.log('New readings:', newReadings);
      }
      if (updatedReadings.length > 0) {
        console.log('Updated readings:', updatedReadings);
      }
      if (deletedReadings.length > 0) {
        console.log('Deleted readings:', deletedReadings);
      }

      const maxTryCount = 3; // Maximum number of retry attempts
      
      /**
       * Helper function to implement retry logic with exponential backoff
       * 
       * @param operation - The async operation to execute with retry
       * @param operationName - Name of the operation for logging
       */
      const executeWithRetry = async <T>(operation: () => Promise<T>, operationName: string): Promise<T> => {
        let tryCount = 0;
        while (tryCount < maxTryCount) {
          try {
            const result = await operation();
            return result; // Success, exit the function
          } catch (error) {
            tryCount++;
            console.error(`Error in ${operationName} (attempt ${tryCount}/${maxTryCount}):`, error);
            if (tryCount >= maxTryCount) {
              console.error(`Max retries reached for ${operationName}. Giving up.`);
              throw error as any; // Re-throw the error after max retries
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, tryCount - 1)));
          }
        }
        // This should be unreachable, but TypeScript needs a fallback
        throw new Error(`Unreachable: executeWithRetry exited loop without returning for ${operationName}`);
      };

      // Create new readings with retry logic
      if (newReadings.length > 0) {
        const obsId = options.sharedStateFromObservation.currentObservation.id;
        const created = await executeWithRetry(
          () => readingService.createMany({
            observationId: obsId,
            readings: newReadings,
          }),
          'creating new readings'
        );
        // Merge server-assigned IDs into local state using tempId
        if (Array.isArray(created)) {
          for (const createdReading of created) {
            if (!createdReading?.tempId) continue;
            const idx = sharedState.currentReadings.findIndex(r => r.tempId && r.tempId === createdReading.tempId);
            if (idx !== -1) {
              sharedState.currentReadings[idx] = {
                ...sharedState.currentReadings[idx],
                id: createdReading.id,
                // keep tempId for correlation; server also returns createdAt/updatedAt
                createdAt: createdReading.createdAt ?? sharedState.currentReadings[idx].createdAt,
                updatedAt: createdReading.updatedAt ?? sharedState.currentReadings[idx].updatedAt,
              } as IReading;
            }
          }
        }
      }

      // Update existing readings with retry logic
      // Only update readings that have an id (persisted readings)
      const readingsToUpdate = updatedReadings.filter((reading): reading is IReading & { id: number } => !!reading.id);
      if (readingsToUpdate.length > 0) {
        const obsId = options.sharedStateFromObservation.currentObservation.id;
        await executeWithRetry(
          () => readingService.updateMany({
            observationId: obsId,
            readings: readingsToUpdate.map((reading) => ({
              id: reading.id,
              name: reading.name,
              description: reading.description,
              type: reading.type,
              dateTime: reading.dateTime,
              tempId: reading.tempId,
            })),
          }),
          'updating readings'
        );
      }

      // Delete readings with retry logic (only those that have a persisted id)
      const deletablesWithId = deletedReadings.filter(r => !!r.id);
      if (deletablesWithId.length > 0) {
        const obsId = options.sharedStateFromObservation.currentObservation.id;
        await executeWithRetry(
          () => readingService.deleteMany({
            observationId: obsId,
            ids: deletablesWithId.map((reading) => reading.id as number),
          }),
          'deleting readings'
        );
      }

      // Update the initialReadings to match the current state after successful synchronization
      // Deep copy to ensure initialReadings is independent from currentReadings
      stateless.initialReadings = sharedState.currentReadings.map((r) => ({
        ...r,
        dateTime: new Date(r.dateTime),
        createdAt: r.createdAt instanceof Date 
          ? r.createdAt 
          : r.createdAt 
            ? new Date(r.createdAt)
            : undefined,
        updatedAt: r.updatedAt instanceof Date 
          ? r.updatedAt 
          : r.updatedAt 
            ? new Date(r.updatedAt)
            : undefined,
      }));
      } finally {
        isSyncInFlight = false;
      }
    },
    
    /**
     * Creates a new reading object with the specified properties
     * 
     * @param options - Optional properties for the new reading
     * @returns A new reading object
     */
    createReading: (options: {
      name?: string;
      description?: string;
      type?: ReadingTypeEnum;
      dateTime?: Date;
      categoryName?: string;
      observableName?: string;
      observableDescription?: string;
      currentDate?: Date;
      elapsedTime?: number;
    } = {}) => {
      // Create base reading with default values
      const newReading: Partial<IReading> = {
        tempId: uuidv4(),
        name: options.name || 'Nouveau relevé',
        description: options.description || '',
        type: options.type || ReadingTypeEnum.DATA,
        dateTime: options.dateTime || new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // If category and observable information is provided, use it for naming
      if (options.categoryName && options.observableName) {
        newReading.name = `${options.observableName}`;
        if (options.observableDescription) {
          newReading.description = options.observableDescription;
        }
      }
      
      // Calculate the exact timestamp based on observation time if provided
      // IMPORTANT: Use getTime() + elapsedTime instead of setMilliseconds() because
      // setMilliseconds() only accepts 0-999, but elapsedTime can be much larger (seconds/minutes).
      // Adding milliseconds directly to getTime() handles overflow correctly.
      // 
      // NOTE: In chronometer mode, currentDate is already t0 + elapsedTime, so we should NOT
      // add elapsedTime again. We use currentDate directly if it exists, otherwise fallback
      // to using elapsedTime with t0 (if in chronometer mode).
      if (options.currentDate && options.elapsedTime !== undefined) {
        // In chronometer mode, currentDate is already t0 + elapsedTime, so use it directly
        // In calendar mode, currentDate is the actual current date, and elapsedTime is the offset
        // from the start of the observation, so we add elapsedTime to currentDate
        const isChronometerMode = observationSharedState?.currentObservation?.mode === 'chronometer';
        
        if (isChronometerMode) {
          // Bug 2b.1 : Clamp to t0 minimum - évite les horodatages négatifs (-2ms)
          const dateTimeMs = options.currentDate.getTime();
          const t0Ms = CHRONOMETER_T0.getTime();
          newReading.dateTime = new Date(Math.max(dateTimeMs, t0Ms));
        } else {
          // In calendar mode, add elapsedTime to currentDate
          newReading.dateTime = new Date(
            options.currentDate.getTime() + (options.elapsedTime * 1000)
          );
        }
      }

      // add the reading to the current readings
      //sharedState.currentReadings.push(newReading as IReading);

      return newReading as IReading;
    },
    
    /**
     * Adds a reading to the current readings list
     * 
     * If a reading is selected, the new reading will be inserted after it.
     * Otherwise, the reading will be added at the end of the list.
     * 
     * @param options - Optional properties for the new reading, or a reading object to add
     * @returns The added reading
     */
    addReading: (options: IReading | {
      name?: string;
      description?: string;
      type?: ReadingTypeEnum;
      dateTime?: Date;
      categoryName?: string;
      observableName?: string;
      observableDescription?: string;
      currentDate?: Date;
      elapsedTime?: number;
    } = {}) => {
      // Determine if we are adding an existing reading object or creating a new one
      const readingToAdd = 'id' in options 
        ? options as IReading 
        : methods.createReading(options);
      
      // If a reading is selected, copy some of its properties (if not already specified)
      // and insert after it in the list
      if (sharedState.selectedReading) {
        const selectedIndex = sharedState.currentReadings.findIndex(
          (r: IReading) => r.id === sharedState.selectedReading?.id
        );
        
        if (selectedIndex !== -1) {
          // Insert after the selected reading
          sharedState.currentReadings.splice(selectedIndex + 1, 0, readingToAdd);
          return sharedState.currentReadings[selectedIndex + 1];
        }
      }
      
      // No selection or selected reading not found, add to the end
      sharedState.currentReadings.push(readingToAdd);
      return sharedState.currentReadings[sharedState.currentReadings.length - 1];
    },

    removeAllReadings: () => {
      sharedState.currentReadings = [];
    },
    
    /**
     * Removes a reading from the current readings
     * 
     * This method supports removing readings by:
     * - ID (for persisted readings)
     * - tempId (for newly created readings that haven't been saved yet)
     * - Reading object (will use id or tempId from the object)
     * 
     * @param readingIdOrObject - The ID, tempId, or reading object to remove
     * @returns true if the reading was removed, false otherwise
     */
    removeReading: (readingIdOrObject: any) => {
      // If no parameter provided, try to use the selected reading
      if (!readingIdOrObject) {
        if (!sharedState.selectedReading) return false;
        readingIdOrObject = sharedState.selectedReading;
      }
      
      // Determine what identifier to use for removal
      let idToFind: any = null;
      let tempIdToFind: string | null = null;
      
      // If it's a reading object, extract id or tempId
      if (typeof readingIdOrObject === 'object' && readingIdOrObject !== null) {
        idToFind = readingIdOrObject.id;
        tempIdToFind = readingIdOrObject.tempId || null;
      } else {
        // Assume it's an id (legacy support)
        idToFind = readingIdOrObject;
      }
      
      // Find the reading in the array by id or tempId
      const index = sharedState.currentReadings.findIndex(
        (r: IReading) => {
          // Match by id if both have id
          if (idToFind && r.id && r.id === idToFind) {
            return true;
          }
          // Match by tempId if both have tempId
          if (tempIdToFind && r.tempId && r.tempId === tempIdToFind) {
            return true;
          }
          // Match by reference (same object)
          if (typeof readingIdOrObject === 'object' && r === readingIdOrObject) {
            return true;
          }
          return false;
        }
      );
      
      // Remove the reading if found
      if (index !== -1) {
        sharedState.currentReadings.splice(index, 1);
        
        // Clear the selection if we removed the selected reading
        // Check by id, tempId, or reference
        if (sharedState.selectedReading) {
          const isSelectedReading = 
            (idToFind && sharedState.selectedReading.id === idToFind) ||
            (tempIdToFind && sharedState.selectedReading.tempId === tempIdToFind) ||
            (typeof readingIdOrObject === 'object' && sharedState.selectedReading === readingIdOrObject);
          
          if (isSelectedReading) {
            sharedState.selectedReading = null;
          }
        }
        
        return true;
      }
      
      return false;
    },
    
    /**
     * Sets the selected reading
     * 
     * @param reading - The reading to select, or null to clear selection
     */
    selectReading: (reading: IReading | null) => {
      sharedState.selectedReading = reading;
    },

    addStartReading: async () => {
      // En mode chronomètre, le reading de début doit être à t0 (durée = 0)
      // On utilise directement t0 comme dateTime pour garantir que la durée affichée sera 0
      const isChronometerMode = observationSharedState.currentObservation?.mode === 'chronometer';
      
      if (isChronometerMode) {
        // En mode chronomètre, utiliser CHRONOMETER_T0 directement pour que la durée soit 0
        // CHRONOMETER_T0 est la date de référence définie dans @utils/chronometer.constants.ts
        // (9 février 1989 à 00:00:00.000 UTC)
        methods.addReading({
          name: 'Début de la chronique',
          type: ReadingTypeEnum.START,
          dateTime: CHRONOMETER_T0, // Utiliser t0 directement pour garantir une durée de 0
        });
      } else {
        // En mode calendrier, utiliser currentDate et elapsedTime normalement
        methods.addReading({
          name: 'Début de la chronique',
          type: ReadingTypeEnum.START,
          currentDate: observationSharedState.currentDate || new Date(),
          elapsedTime: observationSharedState.elapsedTime || 0,
        });
      }
    },
    addStopReading: async () => {
      methods.addReading({
        name: 'Fin de la chronique',
        type: ReadingTypeEnum.STOP,
        currentDate: observationSharedState.currentDate || new Date(),
        elapsedTime: observationSharedState.elapsedTime || 0,
      });
    },
    // Bug 2b.2 : En mode vidéo, ne pas enregistrer les événements pause
    addPauseStartReading: async () => {
      const isVideoMode = observationSharedState?.currentObservation?.mode === 'chronometer'
        && !!observationSharedState?.currentObservation?.videoPath;
      if (isVideoMode) return;
      methods.addReading({
        name: 'Début de pause',
        type: ReadingTypeEnum.PAUSE_START,
        currentDate: observationSharedState.currentDate || new Date(),
        elapsedTime: observationSharedState.elapsedTime || 0,
      });
    },
    addPauseEndReading: async () => {
      const isVideoMode = observationSharedState?.currentObservation?.mode === 'chronometer'
        && !!observationSharedState?.currentObservation?.videoPath;
      if (isVideoMode) return;
      methods.addReading({
        name: 'Fin de pause',
        type: ReadingTypeEnum.PAUSE_END,
        currentDate: observationSharedState.currentDate || new Date(),
        elapsedTime: observationSharedState.elapsedTime || 0,
      });
    },

    /**
     * Corrige automatiquement les relevés en appliquant plusieurs règles :
     * 1. Trie les relevés par ordre croissant d'horodatage
     * 2. Supprime les doublons pour START et STOP (il ne doit y en avoir que 2 au total)
     * 3. Place START au début et STOP à la fin avec horodatage intelligent :
     *    - Si un relevé STOP existe mais n'est pas le plus tardif, le repositionne après le dernier relevé (+ 1ms)
     *    - Si aucun relevé STOP n'existe, en crée un après le dernier relevé (+ 1ms)
     * 4. Vérifie que chaque pause a un début et une fin, ajoute l'élément manquant si nécessaire
     * 
     * @param applyCorrections - Si true, applique les corrections directement. Si false, retourne seulement les actions proposées
     * @returns Objet contenant la liste des actions proposées et les relevés corrigés (si applyCorrections est true)
     */
    autoCorrectReadings: (applyCorrections = false): {
      actions: Array<{
        type: 'sort' | 'remove_duplicate' | 'reorder' | 'add_missing_pause';
        description: string;
        readingIds?: number[];
        tempIds?: string[];
        newReading?: Partial<IReading>;
        stopReadingId?: number;
        stopReadingTempId?: string;
        newStopDateTime?: Date;
      }>;
      correctedReadings: IReading[];
    } => {
      const readings = [...sharedState.currentReadings];
      
      // Use shared auto-correction function
      const result = coreAutoCorrectReadings(readings, applyCorrections);
      
      const actions = result.actions as Array<{
        type: 'sort' | 'remove_duplicate' | 'reorder' | 'add_missing_pause';
        description: string;
        readingIds?: number[];
        tempIds?: string[];
        newReading?: Partial<IReading>;
        stopReadingId?: number;
        stopReadingTempId?: string;
        newStopDateTime?: Date;
      }>;

      // If applyCorrections is true, apply the corrections using the corrected readings from core
      let correctedReadings: IReading[] = [];
      if (applyCorrections) {
        // The core function already returns corrected readings, but we need to:
        // 1. Create new readings that don't have IDs yet (using methods.createReading)
        // 2. Preserve existing readings with their IDs and tempIds
        
        const existingReadingsMap = new Map<number | string, IReading>();
        
        // Build a map of existing readings by id and tempId
        readings.forEach(r => {
          if (r.id) {
            existingReadingsMap.set(r.id, r);
          }
          if (r.tempId) {
            existingReadingsMap.set(r.tempId, r);
          }
        });
        
        // Process corrected readings from core
        for (const correctedReading of result.correctedReadings) {
          // Check if this reading already exists
          const existingReading = correctedReading.id 
            ? existingReadingsMap.get(correctedReading.id)
            : correctedReading.tempId 
              ? existingReadingsMap.get(correctedReading.tempId)
              : null;
          
          if (existingReading) {
            // Update existing reading with corrected dateTime
            existingReading.dateTime = correctedReading.dateTime instanceof Date 
              ? correctedReading.dateTime 
              : new Date(correctedReading.dateTime);
            correctedReadings.push(existingReading);
          } else {
            // This is a new reading, create it using methods.createReading
            const newReading = methods.createReading({
              name: correctedReading.name || 'Nouveau relevé',
              type: correctedReading.type,
              dateTime: correctedReading.dateTime instanceof Date 
                ? correctedReading.dateTime 
                : new Date(correctedReading.dateTime),
            });
            correctedReadings.push(newReading as IReading);
          }
        }
        
        // Apply corrections to sharedState.currentReadings
        sharedState.currentReadings = correctedReadings;
      } else {
        // When not applying corrections, cast core IReading[] to frontend IReading[]
        correctedReadings = result.correctedReadings as IReading[];
      }

      return {
        actions,
        correctedReadings,
      };
    },

  };

  const interval = 1000;
  const runSynchro = async (timeToWait: number) => {
    if (syncTimeoutId) {
      // A loop is already scheduled/running
      return;
    }
    syncTimeoutId = window.setTimeout(async () => {
      syncTimeoutId = null;
      const start = new Date();
      if (options.sharedStateFromObservation.currentObservation?.id && !options.sharedStateFromObservation.loading) {
        await methods.synchronizeReadings();
      }
      const end = new Date();
      const duration = end.getTime() - start.getTime();
      let wait = interval - duration;
      if (wait < 0) {
        wait = 300;
      }
      runSynchro(wait);
    }, timeToWait);
  }

  if (!hasStartedSyncLoop) {
    hasStartedSyncLoop = true;
    runSynchro(0);
  }
  
  

  // Return both the shared state and the methods
  return {
    sharedState,
    methods,
  };
};
