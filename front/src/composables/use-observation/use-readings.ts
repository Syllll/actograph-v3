/**
 * Use Readings Composable
 * 
 * This composable manages the loading, editing, and synchronization of readings
 * associated with an observation. It maintains both the initial state and 
 * current state of readings to track changes for synchronization.
 */

import { IReading, IObservation, ReadingTypeEnum } from '@services/observations/interface';
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { readingService } from '@services/observations/reading.service';
import { v4 as uuidv4 } from 'uuid';
import { CHRONOMETER_T0 } from '@utils/chronometer.constants';
import {
  chronometerDateTimeFromElapsed,
  resolveChronometerStartDateTime,
} from '@utils/chronometer-start-datetime';
import { useWindowSync } from '../use-window-sync';
import {
  autoCorrectReadings as coreAutoCorrectReadings,
  getObservationTimeZone,
  type IAutoCorrectAction,
} from '@actograph/core';
import {
  localizeAutoCorrectAction,
  localizeAutoCorrectReadingName,
} from './auto-correct-i18n';

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
let syncPending = false;
let hasStartedSyncLoop = false;
let syncTimeoutId: number | null = null;

const READINGS_PAGE_SIZE = 1000;

const cloneReadingSnapshot = (reading: IReading): IReading => ({
  ...reading,
  dateTime: new Date(reading.dateTime),
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
});

const findInitialReadingIndex = (reading: IReading): number =>
  stateless.initialReadings.findIndex((initial) => {
    if (reading.tempId && initial.tempId && reading.tempId === initial.tempId) {
      return true;
    }
    if (reading.id && initial.id && reading.id === initial.id) {
      return true;
    }
    return false;
  });

const upsertInitialReading = (reading: IReading): void => {
  const snapshot = cloneReadingSnapshot(reading);
  const index = findInitialReadingIndex(reading);
  if (index >= 0) {
    stateless.initialReadings[index] = snapshot;
  } else {
    stateless.initialReadings.push(snapshot);
  }
};

const removeInitialReadingsByIds = (ids: number[]): void => {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  stateless.initialReadings = stateless.initialReadings.filter(
    (reading) => !reading.id || !idSet.has(reading.id),
  );
};

// Garde pour n'installer qu'une seule fois la synchronisation inter-fenêtres.
let hasSetupWindowSync = false;

// Dans une fenêtre suiveuse (pop-out), on ne diffuse PAS les relevés tant que
// l'owner ne nous a pas hydratés. Cela évite que le chargement initial d'un
// pop-out (relevés persistés uniquement, via GET) n'écrase les relevés "vivants"
// non encore synchronisés détenus par la fenêtre principale.
let followerReadingsHydrated = false;

/**
 * Reconstruit les champs `Date` d'un relevé reçu via le bus inter-fenêtres
 * (les dates ayant été sérialisées en chaînes ISO lors du `postMessage`).
 */
const reconstructReadingDates = (reading: IReading): IReading => ({
  ...reading,
  dateTime: reading.dateTime instanceof Date ? reading.dateTime : new Date(reading.dateTime),
  createdAt: reading.createdAt
    ? reading.createdAt instanceof Date
      ? reading.createdAt
      : new Date(reading.createdAt)
    : undefined,
  updatedAt: reading.updatedAt
    ? reading.updatedAt instanceof Date
      ? reading.updatedAt
      : new Date(reading.updatedAt)
    : undefined,
});

const readingDateTimeMs = (reading: IReading): number => {
  const date = reading.dateTime instanceof Date ? reading.dateTime : new Date(reading.dateTime);
  const ms = date.getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const sortReadingsByDateTime = (readings: IReading[]): IReading[] =>
  [...readings].sort((a, b) => readingDateTimeMs(a) - readingDateTimeMs(b));

export const useReadings = (options: {
  sharedStateFromObservation: any,
}) => {
  const { t, d } = useI18n();
  const observationSharedState = options.sharedStateFromObservation;

  const applyChronologicalOrder = () => {
    sharedState.currentReadings = sortReadingsByDateTime(sharedState.currentReadings);
  };

  const methods = {
    /**
     * Loads all readings associated with the provided observation
     * 
     * @param observation - The observation whose readings should be loaded
     * @returns Promise that resolves when readings are loaded
     */
    loadReadings: async (observation: IObservation) => {
      const readings: IReading[] = [];
      let offset = 0;
      let totalCount = Number.POSITIVE_INFINITY;

      while (offset < totalCount) {
        const page = await readingService.findWithPagination(
          {
            offset,
            limit: READINGS_PAGE_SIZE,
            order: 'ASC',
            orderBy: 'dateTime',
          },
          {
            observationId: observation.id,
          },
        );
        readings.push(...page.results);
        totalCount = page.count;
        if (page.results.length === 0) {
          break;
        }
        offset += page.results.length;
      }
      
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
      
      stateless.initialReadings = readingsWithDates.map(cloneReadingSnapshot);
      sharedState.currentReadings = readingsWithDates;
      applyChronologicalOrder();
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
        syncPending = true;
        return;
      }
      const syncObservationId = options.sharedStateFromObservation.currentObservation?.id ?? null;
      if (syncObservationId === null) {
        return;
      }
      isSyncInFlight = true;
      try {
      // Make a local copy of the current readings
      const currentReadings = [...sharedState.currentReadings];

      const isStaleSync = () =>
        syncObservationId !== (options.sharedStateFromObservation.currentObservation?.id ?? null);

      if (isStaleSync()) {
        return;
      }

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
        const obsId = syncObservationId;
        const created = await executeWithRetry(
          () => readingService.createMany({
            observationId: obsId,
            readings: newReadings,
          }),
          'creating new readings'
        );
        if (isStaleSync()) {
          return;
        }
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
              upsertInitialReading(sharedState.currentReadings[idx]);
            }
          }
        }
      }

      // Update existing readings with retry logic
      // Only update readings that have an id (persisted readings)
      const readingsToUpdate = updatedReadings.filter((reading): reading is IReading & { id: number } => !!reading.id);
      if (readingsToUpdate.length > 0) {
        const obsId = syncObservationId;
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
        if (isStaleSync()) {
          return;
        }
        for (const reading of readingsToUpdate) {
          const current = sharedState.currentReadings.find((r) => r.id === reading.id);
          if (current) {
            upsertInitialReading(current);
          }
        }
      }

      // Delete readings with retry logic (only those that have a persisted id)
      const deletablesWithId = deletedReadings.filter(r => !!r.id);
      if (deletablesWithId.length > 0) {
        const obsId = syncObservationId;
        await executeWithRetry(
          () => readingService.deleteMany({
            observationId: obsId,
            ids: deletablesWithId.map((reading) => reading.id as number),
          }),
          'deleting readings'
        );
        if (isStaleSync()) {
          return;
        }
        removeInitialReadingsByIds(
          deletablesWithId.map((reading) => reading.id as number),
        );
      }

      // Alignement final avec l'état courant après synchronisation complète
      if (!isStaleSync()) {
        stateless.initialReadings = sharedState.currentReadings.map(cloneReadingSnapshot);
      }
      } finally {
        isSyncInFlight = false;
        if (syncPending) {
          syncPending = false;
          void methods.synchronizeReadings();
        }
      }
    },
    
    /**
     * Creates a new reading object with the specified properties
     *
     * In calendar mode, if `elapsedTime` is provided, `currentDate` must also be provided
     * for a correct `dateTime` computation.
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
        name: options.name || t('readings.defaultNewReading'),
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
      
      // Chronometer: always t0 + elapsed. `currentDate || new Date()` is wall
      // clock (~37 years from t0 → "13748j" in the table). Calendar still uses
      // currentDate as absolute time (do not add elapsed, that double-counts).
      const isChronometerMode = observationSharedState?.currentObservation?.mode === 'chronometer';
      if (options.dateTime) {
        if (isChronometerMode) {
          const t0Ms = CHRONOMETER_T0.getTime();
          newReading.dateTime = new Date(Math.max(options.dateTime.getTime(), t0Ms));
        }
      } else if (isChronometerMode) {
        const elapsed = options.elapsedTime ?? observationSharedState.elapsedTime ?? 0;
        newReading.dateTime = chronometerDateTimeFromElapsed(elapsed);
      } else if (options.elapsedTime !== undefined && options.currentDate) {
        newReading.dateTime = new Date(options.currentDate.getTime());
      }

      // add the reading to the current readings
      //sharedState.currentReadings.push(newReading as IReading);

      return newReading as IReading;
    },
    
    /**
     * Adds a reading to the current readings list.
     * Inserts after `insertAfter` when provided; otherwise after the leftover
     * selectedReading; otherwise appends at the end.
     */
    addReading: (
      options: IReading | {
        name?: string;
        description?: string;
        type?: ReadingTypeEnum;
        dateTime?: Date;
        categoryName?: string;
        observableName?: string;
        observableDescription?: string;
        currentDate?: Date;
        elapsedTime?: number;
      } = {},
      insertAfter?: IReading | null,
    ) => {
      // Determine if we are adding an existing reading object or creating a new one
      const readingToAdd = 'id' in options 
        ? options as IReading 
        : methods.createReading(options);
      
      const after = insertAfter ?? sharedState.selectedReading;
      if (after) {
        const selectedIndex = sharedState.currentReadings.findIndex(
          (r: IReading) =>
            (after.id != null && r.id === after.id) ||
            (after.tempId != null && r.tempId === after.tempId) ||
            r === after,
        );
        
        if (selectedIndex !== -1) {
          sharedState.currentReadings.splice(selectedIndex + 1, 0, readingToAdd);
          applyChronologicalOrder();
          return readingToAdd;
        }
      }

      sharedState.currentReadings.push(readingToAdd);
      applyChronologicalOrder();
      return readingToAdd;
    },

    sortReadingsChronologically: () => {
      applyChronologicalOrder();
    },

    /**
     * Replaces one reading by identity so Vue/q-table virtual-scroll sees a new
     * object (in-place field mutation does not refresh recycled rows).
     */
    updateReading: (
      identity: { id?: number; tempId?: string | null },
      patch: Partial<IReading>,
    ) => {
      const idx = sharedState.currentReadings.findIndex((reading) => (
        (identity.id != null && reading.id === identity.id)
        || (Boolean(identity.tempId) && reading.tempId === identity.tempId)
      ));
      if (idx === -1) return;
      sharedState.currentReadings[idx] = {
        ...sharedState.currentReadings[idx],
        ...patch,
        updatedAt: new Date(),
      };
      applyChronologicalOrder();
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

    /**
     * Propage le renommage d'un observable du protocole vers les relevés existants.
     *
     * Les relevés (IReading) stockent le nom de l'observable sous forme de chaîne
     * (pas de référence par id), donc renommer un observable dans le protocole ne
     * met pas à jour les relevés déjà enregistrés avec l'ancien nom. Sans ça,
     * l'onglet Observations continue d'afficher l'ancien nom en rouge (non reconnu).
     *
     * Seuls les relevés de type DATA sont concernés (START/STOP/PAUSE utilisent
     * des libellés fixes, pas le nom d'un observable).
     *
     * @param oldName - Ancien nom de l'observable
     * @param newName - Nouveau nom de l'observable
     */
    renameObservableReadings: async (oldName: string, newName: string) => {
      if (!oldName || !newName || oldName === newName) return;

      let renamed = false;
      sharedState.currentReadings.forEach((reading) => {
        if (reading.type === ReadingTypeEnum.DATA && reading.name === oldName) {
          reading.name = newName;
          reading.updatedAt = new Date();
          renamed = true;
        }
      });

      if (renamed) {
        await methods.synchronizeReadings();
      }
    },

    /**
     * Copies the protocol observable description onto existing DATA readings.
     *
     * A reading stores its own description (copied from the button at click
     * time, then optionally edited in the table). When the protocol text
     * changes, we only update rows that are still empty or still equal to the
     * previous protocol text. Hand-written comments stay as-is.
     */
    updateObservableReadingsDescription: async (
      observableName: string,
      previousDescription: string,
      newDescription: string,
    ) => {
      const previousTrimmed = previousDescription.trim();
      const newTrimmed = newDescription.trim();
      if (!observableName || !newTrimmed || previousTrimmed === newTrimmed) {
        return;
      }

      let updated = false;
      sharedState.currentReadings.forEach((reading) => {
        if (reading.type !== ReadingTypeEnum.DATA || reading.name !== observableName) {
          return;
        }
        const readingTrimmed = (reading.description || '').trim();
        const stillProtocolText =
          readingTrimmed === '' || readingTrimmed === previousTrimmed;
        if (!stillProtocolText) {
          return;
        }
        reading.description = newDescription;
        reading.updatedAt = new Date();
        updated = true;
      });

      if (updated) {
        await methods.synchronizeReadings();
      }
    },

    addStartReading: async () => {
      const isChronometerMode = observationSharedState.currentObservation?.mode === 'chronometer';

      if (isChronometerMode) {
        methods.addReading({
          name: t('readings.defaultChronicleStart'),
          type: ReadingTypeEnum.START,
          dateTime: resolveChronometerStartDateTime(
            sharedState.currentReadings,
            observationSharedState.elapsedTime || 0,
          ),
        });
      } else {
        methods.addReading({
          name: t('readings.defaultChronicleStart'),
          type: ReadingTypeEnum.START,
          currentDate: observationSharedState.currentDate || new Date(),
          elapsedTime: observationSharedState.elapsedTime || 0,
        });
      }
    },
    addStopReading: async () => {
      const isChronometerMode = observationSharedState.currentObservation?.mode === 'chronometer';
      if (isChronometerMode) {
        methods.addReading({
          name: t('readings.defaultChronicleEnd'),
          type: ReadingTypeEnum.STOP,
          elapsedTime: observationSharedState.elapsedTime || 0,
        });
      } else {
        methods.addReading({
          name: t('readings.defaultChronicleEnd'),
          type: ReadingTypeEnum.STOP,
          currentDate: observationSharedState.currentDate || new Date(),
          elapsedTime: observationSharedState.elapsedTime || 0,
        });
      }
    },
    // Bug 2b.2 : En mode vidéo, ne pas enregistrer les événements pause
    addPauseStartReading: async () => {
      const isVideoMode = observationSharedState?.currentObservation?.mode === 'chronometer'
        && !!observationSharedState?.currentObservation?.videoPath;
      if (isVideoMode) return;
      methods.addReading({
        name: t('readings.defaultPauseStart'),
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
        name: t('readings.defaultPauseEnd'),
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
    autoCorrectReadings: (
      applyCorrections = false
    ): {
      actions: IAutoCorrectAction[];
      correctedReadings: IReading[];
    } => {
      const readings = [...sharedState.currentReadings];
      
      // Use shared auto-correction function
      const result = coreAutoCorrectReadings(readings, applyCorrections);

      const currentObservation = observationSharedState.currentObservation;
      const timeZone = currentObservation?.mode === 'calendar'
        ? getObservationTimeZone(currentObservation.meta)
        : undefined;
      const actions = (result.actions as IAutoCorrectAction[]).map((action) => ({
        ...action,
        description: localizeAutoCorrectAction(action, t, d, timeZone),
      }));

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
              name: localizeAutoCorrectReadingName(correctedReading.name, t),
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
        applyChronologicalOrder();
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
      try {
        if (options.sharedStateFromObservation.currentObservation?.id && !options.sharedStateFromObservation.loading) {
          await methods.synchronizeReadings();
        }
      } catch (error) {
        console.error('Readings sync loop error:', error);
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

  // ----------------------------------------------------------------------
  // Synchronisation inter-fenêtres (BroadcastChannel)
  // ----------------------------------------------------------------------
  // - Seule la fenêtre propriétaire (owner) exécute la boucle de
  //   synchronisation vers le backend, ce qui supprime les écritures
  //   concurrentes entre fenêtres (cause des conflits/pertes de relevés).
  // - Toutes les fenêtres diffusent leurs relevés à chaque changement et
  //   appliquent ceux reçus, afin que le tableau de relevés et la timeline
  //   restent synchronisés en temps réel d'une fenêtre à l'autre.
  const windowSync = useWindowSync();

  if (!hasSetupWindowSync) {
    hasSetupWindowSync = true;

    const broadcastReadings = () => {
      windowSync.broadcast('state:readings', sharedState.currentReadings);
    };

    // Diffuser nos relevés à chaque mutation locale (clic bouton, correction,
    // fusion d'ids après synchro backend, etc.). L'owner fait toujours autorité ;
    // un suiveur ne diffuse qu'une fois hydraté (cf. followerReadingsHydrated).
    watch(
      () => sharedState.currentReadings,
      () => {
        if (windowSync.isApplyingRemote()) return;
        if (!windowSync.isOwner && !followerReadingsHydrated) return;
        broadcastReadings();
      },
      { deep: true }
    );

    // Appliquer les relevés reçus d'une autre fenêtre. On conserve les `id`
    // déjà connus localement (mapping tempId -> id) pour rendre l'assignation
    // d'id monotone et résister aux races de réplication.
    windowSync.on('state:readings', (payload: IReading[]) => {
      if (!Array.isArray(payload)) return;
      // Un suiveur est désormais aligné sur l'état partagé : il peut diffuser
      // ses futures mutations locales.
      if (!windowSync.isOwner) followerReadingsHydrated = true;
      windowSync.applyRemote(() => {
        const idByTempId = new Map<string, number>();
        for (const reading of sharedState.currentReadings) {
          if (reading.tempId && reading.id) {
            idByTempId.set(reading.tempId, reading.id);
          }
        }
        sharedState.currentReadings = payload.map((raw) => {
          const reading = reconstructReadingDates(raw);
          if (!reading.id && reading.tempId && idByTempId.has(reading.tempId)) {
            reading.id = idByTempId.get(reading.tempId);
          }
          return reading;
        });
        applyChronologicalOrder();
      });
    });

    // L'owner fait autorité : il répond aux demandes d'hydratation des pop-out
    // avec l'état "vivant" (incluant d'éventuels relevés non encore persistés).
    windowSync.on('hydrate:request', () => {
      if (windowSync.isOwner) broadcastReadings();
    });
  }

  // Boucle de synchronisation backend : owner uniquement.
  if (!hasStartedSyncLoop && windowSync.isOwner) {
    hasStartedSyncLoop = true;
    runSynchro(0);
  }

  // Return both the shared state and the methods
  return {
    sharedState,
    methods,
  };
};
