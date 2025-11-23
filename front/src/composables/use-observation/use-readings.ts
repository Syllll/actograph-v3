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
        createdAt: reading.createdAt instanceof Date ? reading.createdAt : new Date(reading.createdAt),
        updatedAt: reading.updatedAt instanceof Date ? reading.updatedAt : new Date(reading.updatedAt),
      }));
      
      stateless.initialReadings = readingsWithDates;
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
        const hasChanged = (
          current.name !== initialReading.name ||
          current.description !== initialReading.description ||
          current.type !== initialReading.type ||
          current.dateTime !== initialReading.dateTime
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
      if (updatedReadings.length > 0) {
        const obsId = options.sharedStateFromObservation.currentObservation.id;
        await executeWithRetry(
          () => readingService.updateMany({
            observationId: obsId,
            readings: updatedReadings.map((reading) => ({
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
      stateless.initialReadings = [...sharedState.currentReadings];
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
          // In chronometer mode, currentDate is already t0 + elapsedTime
          // Use it directly without adding elapsedTime again
          newReading.dateTime = new Date(options.currentDate.getTime());
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
    addPauseStartReading: async () => {
      methods.addReading({
        name: 'Début de pause',
        type: ReadingTypeEnum.PAUSE_START,
        currentDate: observationSharedState.currentDate || new Date(),
        elapsedTime: observationSharedState.elapsedTime || 0,
      });
    },
    addPauseEndReading: async () => {
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
      const actions: Array<{
        type: 'sort' | 'remove_duplicate' | 'reorder' | 'add_missing_pause';
        description: string;
        readingIds?: number[];
        tempIds?: string[];
        newReading?: Partial<IReading>;
      }> = [];
      const correctedReadings: IReading[] = [];

      // 1. Trier les relevés par ordre croissant d'horodatage
      const sortedReadings = [...readings].sort((a, b) => {
        const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
        const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
        return dateA.getTime() - dateB.getTime();
      });

      // Vérifier si un tri est nécessaire
      const needsSorting = sortedReadings.some((reading, index) => {
        const originalIndex = readings.findIndex(r => 
          (r.id && reading.id && r.id === reading.id) ||
          (r.tempId && reading.tempId && r.tempId === reading.tempId)
        );
        return originalIndex !== index;
      });

      if (needsSorting) {
        actions.push({
          type: 'sort',
          description: 'Trier les relevés par ordre chronologique croissant',
        });
      }

      // 2. Supprimer les doublons pour START et STOP (il ne doit y en avoir que 2 au total)
      const startReadings = sortedReadings.filter(r => r.type === ReadingTypeEnum.START);
      const stopReadings = sortedReadings.filter(r => r.type === ReadingTypeEnum.STOP);

      // Garder seulement le premier START et le dernier STOP
      if (startReadings.length > 1) {
        const toRemove = startReadings.slice(1); // Garder le premier, supprimer les autres
        // Collecter les ids ET les tempIds pour pouvoir supprimer même les readings non sauvegardés
        const toRemoveIds = toRemove.map(r => r.id).filter((id): id is number => !!id);
        const toRemoveTempIds = toRemove.map(r => r.tempId).filter((id): id is string => !!id);
        
        actions.push({
          type: 'remove_duplicate',
          description: `Supprimer ${toRemove.length} doublon(s) de relevé "Début" (garder le premier)`,
          readingIds: toRemoveIds.length > 0 ? toRemoveIds : undefined,
          // Stocker aussi les tempIds pour pouvoir les supprimer
          tempIds: toRemoveTempIds.length > 0 ? toRemoveTempIds : undefined,
        } as any);
      }

      if (stopReadings.length > 1) {
        const toRemove = stopReadings.slice(0, -1); // Garder le dernier, supprimer les autres
        const toRemoveIds = toRemove.map(r => r.id).filter((id): id is number => !!id);
        const toRemoveTempIds = toRemove.map(r => r.tempId).filter((id): id is string => !!id);
        
        actions.push({
          type: 'remove_duplicate',
          description: `Supprimer ${toRemove.length} doublon(s) de relevé "Fin" (garder le dernier)`,
          readingIds: toRemoveIds.length > 0 ? toRemoveIds : undefined,
          tempIds: toRemoveTempIds.length > 0 ? toRemoveTempIds : undefined,
        } as any);
      }

      // 3. Placer START au début et STOP à la fin avec horodatage intelligent
      const hasStart = sortedReadings.some(r => r.type === ReadingTypeEnum.START);
      const hasStop = sortedReadings.some(r => r.type === ReadingTypeEnum.STOP);
      const firstReading = sortedReadings[0];
      const lastReading = sortedReadings[sortedReadings.length - 1];

      if (hasStart && firstReading.type !== ReadingTypeEnum.START) {
        actions.push({
          type: 'reorder',
          description: 'Déplacer le relevé "Début" au début de la liste',
        });
      }

      // Gestion intelligente du relevé STOP
      if (hasStop) {
        // Trouver tous les relevés STOP
        const stopReadings = sortedReadings.filter(r => r.type === ReadingTypeEnum.STOP);
        
        // Trouver le relevé le plus tardif (hors STOP)
        const nonStopReadings = sortedReadings.filter(r => r.type !== ReadingTypeEnum.STOP);
        const latestNonStopReading = nonStopReadings.length > 0 
          ? nonStopReadings[nonStopReadings.length - 1]
          : null;
        
        // Trouver le STOP le plus tardif
        const latestStopReading = stopReadings.reduce((latest, current) => {
          const latestDate = latest.dateTime instanceof Date ? latest.dateTime : new Date(latest.dateTime);
          const currentDate = current.dateTime instanceof Date ? current.dateTime : new Date(current.dateTime);
          return currentDate.getTime() > latestDate.getTime() ? current : latest;
        }, stopReadings[0]);
        
        // Vérifier si le STOP est bien le dernier relevé (le plus tardif)
        if (latestNonStopReading) {
          const stopDate = latestStopReading.dateTime instanceof Date 
            ? latestStopReading.dateTime 
            : new Date(latestStopReading.dateTime);
          const latestNonStopDate = latestNonStopReading.dateTime instanceof Date 
            ? latestNonStopReading.dateTime 
            : new Date(latestNonStopReading.dateTime);
          
          // Si le STOP n'est pas après le dernier relevé, il faut le repositionner
          if (stopDate.getTime() <= latestNonStopDate.getTime()) {
            // Calculer le nouvel horodatage : dernier reading + 1ms pour être sûr qu'il soit après
            const newStopDate = new Date(latestNonStopDate.getTime() + 1);
            
            actions.push({
              type: 'reorder',
              description: `Repositionner le relevé "Fin" après le dernier relevé (${newStopDate.toLocaleString()})`,
              // Stocker les informations pour la correction
              stopReadingId: latestStopReading.id,
              stopReadingTempId: latestStopReading.tempId,
              newStopDateTime: newStopDate,
            } as any);
          }
        }
        
        // Vérifier si le STOP est bien le dernier élément de la liste (après tri)
        // Cette vérification se fera après le tri, donc on ne l'ajoute pas ici
      } else {
        // Pas de relevé STOP, il faut en créer un
        if (sortedReadings.length > 0) {
          const lastReadingDate = lastReading.dateTime instanceof Date 
            ? lastReading.dateTime 
            : new Date(lastReading.dateTime);
          // Créer un relevé STOP juste après le dernier reading (+ 1ms)
          const newStopDate = new Date(lastReadingDate.getTime() + 1);
          
          actions.push({
            type: 'add_missing_pause', // Réutiliser ce type pour ajouter un relevé manquant
            description: `Ajouter un relevé "Fin" manquant après le dernier relevé (${newStopDate.toLocaleString()})`,
            newReading: {
              name: 'Fin de la chronique',
              type: ReadingTypeEnum.STOP,
              dateTime: newStopDate,
            },
          });
        }
      }

      // 4. Supprimer les doublons de pauses et apparier correctement les pauses
      const pauseStarts: IReading[] = [];
      const pauseEnds: IReading[] = [];
      
      // Collecter tous les PAUSE_START et PAUSE_END
      sortedReadings.forEach(reading => {
        if (reading.type === ReadingTypeEnum.PAUSE_START) {
          pauseStarts.push(reading);
        } else if (reading.type === ReadingTypeEnum.PAUSE_END) {
          pauseEnds.push(reading);
        }
      });
      
      // Apparier les pauses : chaque PAUSE_START doit avoir un PAUSE_END correspondant
      // On garde seulement les paires valides, on supprime les doublons
      const validPausePairs: Array<{ start: IReading; end: IReading }> = [];
      const usedStarts = new Set<IReading>();
      const usedEnds = new Set<IReading>();
      
      // Pour chaque PAUSE_START, trouver le PAUSE_END le plus proche après lui
      pauseStarts.forEach(pauseStart => {
        const pauseStartDate = pauseStart.dateTime instanceof Date 
          ? pauseStart.dateTime 
          : new Date(pauseStart.dateTime);
        
        // Trouver le PAUSE_END non utilisé le plus proche après ce PAUSE_START
        const matchingEnd = pauseEnds
          .filter(end => !usedEnds.has(end))
          .filter(end => {
            const endDate = end.dateTime instanceof Date ? end.dateTime : new Date(end.dateTime);
            return endDate.getTime() > pauseStartDate.getTime();
          })
          .sort((a, b) => {
            const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
            const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
            return dateA.getTime() - dateB.getTime();
          })[0];
        
        if (matchingEnd) {
          validPausePairs.push({ start: pauseStart, end: matchingEnd });
          usedStarts.add(pauseStart);
          usedEnds.add(matchingEnd);
        }
      });
      
      // Supprimer les PAUSE_START non appariés (doublons)
      const unpairedStarts = pauseStarts.filter(start => !usedStarts.has(start));
      if (unpairedStarts.length > 0) {
        const toRemoveIds = unpairedStarts.map(r => r.id).filter((id): id is number => !!id);
        const toRemoveTempIds = unpairedStarts.map(r => r.tempId).filter((id): id is string => !!id);
        
        actions.push({
          type: 'remove_duplicate',
          description: `Supprimer ${unpairedStarts.length} relevé(s) "Début de pause" non apparié(s)`,
          readingIds: toRemoveIds.length > 0 ? toRemoveIds : undefined,
          tempIds: toRemoveTempIds.length > 0 ? toRemoveTempIds : undefined,
        } as any);
      }
      
      // Pour chaque PAUSE_END non apparié, ajouter un PAUSE_START avant lui
      const unpairedEnds = pauseEnds.filter(end => !usedEnds.has(end));
      unpairedEnds.forEach(pauseEnd => {
        const pauseEndDate = pauseEnd.dateTime instanceof Date 
          ? pauseEnd.dateTime 
          : new Date(pauseEnd.dateTime);
        const pauseStartDate = new Date(pauseEndDate.getTime() - 1);
        
        actions.push({
          type: 'add_missing_pause',
          description: `Ajouter un relevé "Début de pause" manquant avant le relevé "Fin de pause" à ${pauseEndDate.toLocaleString()}`,
          newReading: {
            name: 'Début de pause',
            type: ReadingTypeEnum.PAUSE_START,
            dateTime: pauseStartDate,
          },
        });
      });
      
      // Pour chaque PAUSE_START apparié mais sans PAUSE_END après lui (cas théorique)
      // Ce cas ne devrait pas arriver car on a déjà apparié, mais on vérifie quand même
      pauseStarts.forEach(pauseStart => {
        if (usedStarts.has(pauseStart)) {
          const pair = validPausePairs.find(p => p.start === pauseStart);
          if (!pair) {
            // PAUSE_START apparié mais la paire n'existe pas ? Ajouter un PAUSE_END
            const pauseStartDate = pauseStart.dateTime instanceof Date 
              ? pauseStart.dateTime 
              : new Date(pauseStart.dateTime);
            const pauseEndDate = new Date(pauseStartDate.getTime() + 1);
            
            actions.push({
              type: 'add_missing_pause',
              description: `Ajouter un relevé "Fin de pause" manquant après le relevé "Début de pause" à ${pauseStartDate.toLocaleString()}`,
              newReading: {
                name: 'Fin de pause',
                type: ReadingTypeEnum.PAUSE_END,
                dateTime: pauseEndDate,
              },
            });
          }
        }
      });

      // Si applyCorrections est true, appliquer les corrections
      if (applyCorrections) {
        // ÉTAPE 1 : Trier d'abord chronologiquement
        const workingReadings = [...readings].sort((a, b) => {
          const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
          const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
          return dateA.getTime() - dateB.getTime();
        });

        // ÉTAPE 2 : Appliquer les suppressions de doublons
        actions.forEach(action => {
          if (action.type === 'remove_duplicate') {
            // Trouver les readings à supprimer par id ou tempId
            const readingsToRemove = workingReadings.filter(r => {
              if (action.readingIds && r.id && action.readingIds.includes(r.id)) {
                return true;
              }
              if (action.tempIds && r.tempId && action.tempIds.includes(r.tempId)) {
                return true;
              }
              return false;
            });
            
            // Supprimer chaque reading de la liste (en ordre inverse pour éviter les problèmes d'index)
            readingsToRemove.reverse().forEach(readingToRemove => {
              const index = workingReadings.findIndex(r => 
                (r.id && readingToRemove.id && r.id === readingToRemove.id) ||
                (r.tempId && readingToRemove.tempId && r.tempId === readingToRemove.tempId)
              );
              if (index !== -1) {
                workingReadings.splice(index, 1);
              }
            });
          }
        });

        // ÉTAPE 3 : Appliquer les ajouts de pauses manquantes
        actions.forEach(action => {
          if (action.type === 'add_missing_pause' && action.newReading) {
            const newReading = methods.createReading({
              name: action.newReading.name || 'Nouveau relevé',
              type: action.newReading.type || ReadingTypeEnum.DATA,
              dateTime: action.newReading.dateTime || new Date(),
            });
            workingReadings.push(newReading as IReading);
          }
        });

        // ÉTAPE 4 : Appliquer les repositionnements de STOP avec horodatage intelligent
        actions.forEach(action => {
          if (action.type === 'reorder' && (action as any).newStopDateTime) {
            const stopReading = workingReadings.find(r => 
              ((action as any).stopReadingId && r.id === (action as any).stopReadingId) ||
              ((action as any).stopReadingTempId && r.tempId === (action as any).stopReadingTempId)
            );
            
            if (stopReading && (action as any).newStopDateTime) {
              stopReading.dateTime = (action as any).newStopDateTime;
            }
          }
        });

        // ÉTAPE 5 : Retrier après toutes les modifications
        workingReadings.sort((a, b) => {
          const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
          const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
          return dateA.getTime() - dateB.getTime();
        });

        // ÉTAPE 6 : S'assurer que START a l'horodatage le plus petit et STOP le plus grand
        const startReadings = workingReadings.filter(r => r.type === ReadingTypeEnum.START);
        const stopReadings = workingReadings.filter(r => r.type === ReadingTypeEnum.STOP);
        const otherReadings = workingReadings.filter(r => 
          r.type !== ReadingTypeEnum.START && r.type !== ReadingTypeEnum.STOP
        );

        // Trouver le relevé avec l'horodatage le plus petit (hors START)
        let earliestDate: Date | null = null;
        if (otherReadings.length > 0) {
          const dates = otherReadings.map(r => {
            return r.dateTime instanceof Date ? r.dateTime : new Date(r.dateTime);
          });
          earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
        }

        // Trouver le relevé avec l'horodatage le plus grand (hors STOP)
        let latestDate: Date | null = null;
        if (otherReadings.length > 0) {
          const dates = otherReadings.map(r => {
            return r.dateTime instanceof Date ? r.dateTime : new Date(r.dateTime);
          });
          latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
        } else if (startReadings.length > 0) {
          // Si pas d'autres relevés, utiliser START comme référence
          const startDate = startReadings[0].dateTime instanceof Date 
            ? startReadings[0].dateTime 
            : new Date(startReadings[0].dateTime);
          latestDate = startDate;
        }

        // Ajuster START pour qu'il soit avant tous les autres
        if (startReadings.length > 0) {
          const startReading = startReadings[0]; // On garde seulement le premier
          if (earliestDate) {
            const startDate = startReading.dateTime instanceof Date 
              ? startReading.dateTime 
              : new Date(startReading.dateTime);
            // Si START n'est pas avant le premier relevé, le repositionner
            if (startDate.getTime() >= earliestDate.getTime()) {
              startReading.dateTime = new Date(earliestDate.getTime() - 1);
            }
          } else {
            // Pas d'autres relevés, START peut rester à sa date actuelle ou être mis à 0
            const startDate = startReading.dateTime instanceof Date 
              ? startReading.dateTime 
              : new Date(startReading.dateTime);
            // Si START n'est pas à 0 ou avant, le mettre juste avant le premier relevé
            if (startDate.getTime() > 0) {
              startReading.dateTime = new Date(0);
            }
          }
        }

        // Ajuster STOP pour qu'il soit après tous les autres
        if (stopReadings.length > 0) {
          const stopReading = stopReadings[stopReadings.length - 1]; // On garde seulement le dernier
          if (latestDate) {
            const stopDate = stopReading.dateTime instanceof Date 
              ? stopReading.dateTime 
              : new Date(stopReading.dateTime);
            // Si STOP n'est pas après le dernier relevé, le repositionner
            if (stopDate.getTime() <= latestDate.getTime()) {
              stopReading.dateTime = new Date(latestDate.getTime() + 1);
            }
          } else {
            // Pas d'autres relevés, STOP doit être après START
            const startReading = startReadings[0];
            if (startReading) {
              const startDate = startReading.dateTime instanceof Date 
                ? startReading.dateTime 
                : new Date(startReading.dateTime);
              stopReading.dateTime = new Date(startDate.getTime() + 1);
            }
          }
        }

        // ÉTAPE 7 : Trier une dernière fois après les ajustements d'horodatage
        workingReadings.sort((a, b) => {
          const dateA = a.dateTime instanceof Date ? a.dateTime : new Date(a.dateTime);
          const dateB = b.dateTime instanceof Date ? b.dateTime : new Date(b.dateTime);
          return dateA.getTime() - dateB.getTime();
        });

        // ÉTAPE 8 : Reconstruire la liste en s'assurant que START est le premier et STOP le dernier
        correctedReadings.length = 0;
        
        // Ajouter START en premier s'il existe
        const finalStartReading = workingReadings.find(r => r.type === ReadingTypeEnum.START);
        if (finalStartReading) {
          correctedReadings.push(finalStartReading);
        }
        
        // Ajouter tous les autres relevés (triés par dateTime)
        const finalOtherReadings = workingReadings.filter(r => 
          r.type !== ReadingTypeEnum.START && r.type !== ReadingTypeEnum.STOP
        );
        correctedReadings.push(...finalOtherReadings);
        
        // Ajouter STOP en dernier s'il existe
        const finalStopReading = workingReadings.find(r => r.type === ReadingTypeEnum.STOP);
        if (finalStopReading) {
          correctedReadings.push(finalStopReading);
        }

        // ÉTAPE 9 : Appliquer les corrections à sharedState.currentReadings
        // On remplace complètement la liste pour garantir l'ordre correct
        sharedState.currentReadings = correctedReadings;
      }

      return {
        actions,
        correctedReadings: applyCorrections ? correctedReadings : [],
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
