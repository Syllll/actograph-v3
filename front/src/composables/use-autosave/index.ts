/**
 * Autosave composable
 * Manages automatic periodic saving of observations
 */

import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { autosaveService } from '@services/observations/autosave.service';
import { IObservation, IReading, IProtocol } from '@services/observations/interface';

const AUTOSAVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_AUTOSAVE_FILES = 20; // Keep only the 20 most recent autosave files

// Shared state for autosave
const sharedState = {
  enabled: ref(true),
  interval: ref<number | null>(null),
  lastSaveTime: ref<Date | null>(null),
  lastObservationHash: ref<string | null>(null),
};

/**
 * Generate a hash of the observation state for change detection
 * 
 * This hash includes ALL entities associated with the observation:
 * - Observation properties (id, name, description, videoPath, mode, updatedAt)
 * - ALL readings (id, updatedAt, dateTime, type, name) - detects additions, modifications, deletions
 * - Protocol (id, updatedAt, items hash) - detects protocol changes
 * - ActivityGraph (id, updatedAt) - detects activity graph changes
 * 
 * This ensures that ANY change to the observation or its related entities
 * will be detected, even if the observation's updatedAt doesn't change.
 * 
 * @param observation - The observation object
 * @param readings - Array of readings from the readings composable (may be more up-to-date than observation.readings)
 * @param protocol - Protocol object from the protocol composable (may be more up-to-date than observation.protocol)
 */
function generateObservationHash(
  observation: IObservation | null,
  readings: IReading[] = [],
  protocol: IProtocol | null = null,
): string {
  if (!observation) {
    return '';
  }

  // Use readings from parameter (from composable) or fallback to observation.readings
  // The composable readings are more reliable as they're always up-to-date
  const allReadings = readings.length > 0 ? readings : (observation.readings || []);

  // Hash all readings - include id, updatedAt, dateTime, type, name
  // This detects: additions, modifications, deletions
  const readingsHash = allReadings.map(reading => ({
    id: reading.id,
    updatedAt: reading.updatedAt instanceof Date 
      ? reading.updatedAt.toISOString() 
      : reading.updatedAt 
        ? new Date(reading.updatedAt).toISOString()
        : null,
    dateTime: reading.dateTime instanceof Date 
      ? reading.dateTime.toISOString() 
      : new Date(reading.dateTime).toISOString(),
    type: reading.type,
    name: reading.name,
    // Include tempId for readings that haven't been saved yet
    tempId: reading.tempId || null,
  })).sort((a, b) => {
    // Sort by id for consistent hashing (tempId readings will be sorted by tempId)
    if (a.id && b.id) {
      return a.id - b.id;
    }
    if (a.tempId && b.tempId) {
      return a.tempId.localeCompare(b.tempId);
    }
    return 0;
  });

  // Use protocol from parameter (from composable) or fallback to observation.protocol
  // The composable protocol is more reliable as it's always up-to-date
  const currentProtocol = protocol || observation.protocol;

  // Hash protocol - include id, updatedAt, and a hash of items content
  // This detects protocol changes even if updatedAt doesn't change
  let protocolHash: {
    id: number;
    updatedAt: string;
    itemsHash: string;
    itemsLength: number;
  } | null = null;
  if (currentProtocol) {
    // Use items from _items if available (parsed), otherwise use items string
    const itemsToHash = currentProtocol._items || currentProtocol.items;
    const itemsString = typeof itemsToHash === 'string' 
      ? itemsToHash 
      : JSON.stringify(itemsToHash);
    
    // Create a simple but effective hash of the items content
    // This is a simple hash function that combines length and character codes
    let itemsContentHash = 0;
    for (let i = 0; i < Math.min(itemsString.length, 1000); i++) {
      itemsContentHash = ((itemsContentHash << 5) - itemsContentHash) + itemsString.charCodeAt(i);
      itemsContentHash = itemsContentHash & itemsContentHash; // Convert to 32-bit integer
    }
    
    protocolHash = {
      id: currentProtocol.id,
      updatedAt: currentProtocol.updatedAt instanceof Date
        ? currentProtocol.updatedAt.toISOString()
        : new Date(currentProtocol.updatedAt).toISOString(),
      // Hash the items content - combination of length and content hash
      itemsHash: `${itemsString.length}_${itemsContentHash}`,
      itemsLength: itemsString.length,
    };
  }

  // Hash activity graph if present
  const activityGraphHash = observation.activityGraph ? {
    id: observation.activityGraph.id,
    updatedAt: observation.activityGraph.updatedAt instanceof Date
      ? observation.activityGraph.updatedAt.toISOString()
      : new Date(observation.activityGraph.updatedAt).toISOString(),
  } : null;

  // Create a comprehensive hash based on ALL observation-related data
  const hashData = {
    // Observation properties
    id: observation.id,
    name: observation.name,
    description: observation.description,
    videoPath: observation.videoPath,
    mode: observation.mode,
    updatedAt: observation.updatedAt instanceof Date
      ? observation.updatedAt.toISOString()
      : new Date(observation.updatedAt).toISOString(),
    createdAt: observation.createdAt instanceof Date
      ? observation.createdAt.toISOString()
      : new Date(observation.createdAt).toISOString(),
    
    // All readings (complete list)
    readings: readingsHash,
    readingsCount: readingsHash.length,
    
    // Protocol (with content hash)
    protocol: protocolHash,
    
    // Activity graph
    activityGraph: activityGraphHash,
  };

  return JSON.stringify(hashData);
}

/**
 * Autosave composable
 */
export const useAutosave = () => {
  const observation = useObservation();

  const methods = {
    /**
     * Start autosave for the current observation
     */
    start: () => {
      if (!sharedState.enabled.value) {
        return;
      }

      // Clear existing interval if any
      if (sharedState.interval.value !== null) {
        clearInterval(sharedState.interval.value);
      }

      // Start periodic autosave
      sharedState.interval.value = window.setInterval(async () => {
        await methods.performAutosave();
      }, AUTOSAVE_INTERVAL_MS);

      // Perform initial autosave
      methods.performAutosave();
    },

    /**
     * Stop autosave
     */
    stop: () => {
      if (sharedState.interval.value !== null) {
        clearInterval(sharedState.interval.value);
        sharedState.interval.value = null;
      }
    },

    /**
     * Perform autosave if observation has changed
     */
    performAutosave: async () => {
      const currentObservation = observation.sharedState.currentObservation;

      if (!currentObservation || !currentObservation.id) {
        return;
      }

      // Get readings and protocol from composables (more reliable than observation.readings/protocol)
      // These are always up-to-date with the latest changes
      const currentReadings = observation.readings.sharedState.currentReadings || [];
      const currentProtocol = observation.protocol.sharedState.currentProtocol;

      // Generate hash of current observation state including ALL related entities
      const currentHash = generateObservationHash(
        currentObservation,
        currentReadings,
        currentProtocol,
      );

      // Skip if observation hasn't changed since last save
      if (
        sharedState.lastObservationHash.value === currentHash &&
        sharedState.lastSaveTime.value !== null
      ) {
        return;
      }

      // Save to autosave folder
      // Note: autosaveService will fetch fresh data from backend, so we pass the observation
      const filePath = await autosaveService.saveToAutosave(currentObservation);

      if (filePath) {
        sharedState.lastSaveTime.value = new Date();
        sharedState.lastObservationHash.value = currentHash;

        // Clean up old autosave files (keep only the most recent ones)
        const files = await autosaveService.listAutosaveFiles();
        if (files.length > MAX_AUTOSAVE_FILES) {
          // Sort by modified date (most recent first) and delete older ones
          const filesToDelete = files
            .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
            .slice(MAX_AUTOSAVE_FILES);

          for (const file of filesToDelete) {
            await autosaveService.deleteAutosaveFile(file.path);
          }
        }
      }
    },

    /**
     * Clean up old autosave files on startup
     */
    cleanupOnStartup: async () => {
      await autosaveService.cleanupOldFiles(7); // Delete files older than 7 days
    },
  };

  // Watch for observation changes to reset autosave
  watch(
    () => observation.sharedState.currentObservation?.id,
    (newId, oldId) => {
      if (newId !== oldId) {
        // Observation changed, reset autosave state
        sharedState.lastObservationHash.value = null;
        sharedState.lastSaveTime.value = null;

        // Restart autosave for new observation
        if (newId) {
          methods.start();
        } else {
          methods.stop();
        }
      }
    }
  );

  // Start autosave when observation is loaded
  watch(
    () => observation.sharedState.currentObservation,
    (newObservation) => {
      if (newObservation && newObservation.id) {
        methods.start();
      } else {
        methods.stop();
      }
    },
    { immediate: true }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    methods.stop();
  });

  return {
    methods,
    sharedState,
  };
};

