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

// Stateless object to store the initial readings (used for comparison during sync)
const stateless = {
  initialReadings: [] as IReading[],
}

// Reactive state that can be shared across component instances
const sharedState = reactive({
  currentReadings: [] as IReading[],
  selectedReading: null as IReading | null,
});

export const useReadings = (options: {
  sharedStateFromObservation: any,
}) => {
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
      stateless.initialReadings = readings;
      sharedState.currentReadings = readings;
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
      const executeWithRetry = async (operation: () => Promise<any>, operationName: string) => {
        let tryCount = 0;
        while (tryCount < maxTryCount) {
          try {
            await operation();
            return; // Success, exit the function
          } catch (error) {
            tryCount++;
            console.error(`Error in ${operationName} (attempt ${tryCount}/${maxTryCount}):`, error);
            if (tryCount >= maxTryCount) {
              console.error(`Max retries reached for ${operationName}. Giving up.`);
              throw error; // Re-throw the error after max retries
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, tryCount - 1)));
          }
        }
      };

      // Create new readings with retry logic
      if (newReadings.length > 0) {
        const obsId = options.sharedStateFromObservation.currentObservation.id;
        await executeWithRetry(
          () => readingService.createMany({
            observationId: obsId,
            readings: newReadings,
          }),
          'creating new readings'
        );
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

      // Delete readings with retry logic
      if (deletedReadings.length > 0) {
        const obsId = options.sharedStateFromObservation.currentObservation.id;
        await executeWithRetry(
          () => readingService.deleteMany({
            observationId: obsId,
            ids: deletedReadings.map((reading) => reading.id),
          }),
          'deleting readings'
        );
      }

      // Update the initialReadings to match the current state after successful synchronization
      stateless.initialReadings = [...currentReadings];
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
      if (options.currentDate && options.elapsedTime !== undefined) {
        const dateTimeWithOffset = new Date(options.currentDate);
        dateTimeWithOffset.setMilliseconds(
          dateTimeWithOffset.getMilliseconds() + 
          (options.elapsedTime * 1000)
        );
        newReading.dateTime = dateTimeWithOffset;
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
     * @param readingId - The ID of the reading to remove
     * @returns true if the reading was removed, false otherwise
     */
    removeReading: (readingId: any) => {
      if (!readingId) {
        // If no reading ID is provided, use the selected reading
        if (!sharedState.selectedReading) return false;
        readingId = sharedState.selectedReading.id;
      }
      
      const index = sharedState.currentReadings.findIndex(
        (r: IReading) => r.id === readingId
      );
      
      if (index !== -1) {
        sharedState.currentReadings.splice(index, 1);
        
        // If we removed the selected reading, clear the selection
        if (sharedState.selectedReading?.id === readingId) {
          sharedState.selectedReading = null;
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
      methods.addReading({
        name: 'Début de la chronique',
        type: ReadingTypeEnum.START,
        dateTime: new Date(),
      });
    },
    addStopReading: async () => {
      methods.addReading({
        name: 'Fin de la chronique',
        type: ReadingTypeEnum.STOP,
        dateTime: new Date(),
      });
    },
    addPauseStartReading: async () => {
      methods.addReading({
        name: 'Début de pause',
        type: ReadingTypeEnum.PAUSE_START,
        dateTime: new Date(),
      });
    },
    addPauseEndReading: async () => {
      methods.addReading({
        name: 'Fin de pause',
        type: ReadingTypeEnum.PAUSE_END,
        dateTime: new Date(),
      });
    },

  };

  const interval = 1000;
  const runSynchro = async (timeToWait: number) => {

    setTimeout(async () => {
      const start = new Date();
      if (options.sharedStateFromObservation.currentObservation?.id && !options.sharedStateFromObservation.loading) {
        await methods.synchronizeReadings()
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

  runSynchro(0);
  
  

  // Return both the shared state and the methods
  return {
    sharedState,
    methods,
  };
};
