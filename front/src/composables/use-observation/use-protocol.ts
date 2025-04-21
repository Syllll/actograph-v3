/**
 * Protocol management composable for observations
 * This file provides a Vue composable for managing observation protocols.
 */

import { IObservation, IProtocol } from '@services/observations/interface';
import {
  AddCategoryDto,
  AddObservableDto,
  EditItemDto,
  protocolService,
} from '@services/observations/protocol.service';
import { reactive } from 'vue';

/**
 * Shared reactive state for protocol management
 * This state can be accessed from multiple components that use this composable
 */
const sharedState = reactive({
  currentProtocol: null as IProtocol | null,
});

/**
 * Protocol management composable
 * Provides methods and state for handling observation protocols
 * 
 * @param options - Configuration options for the composable
 * @param options.sharedStateFromObservation - Shared state from the observation composable
 * @returns Methods and state for protocol management
 */
export const useProtocol = (options: { sharedStateFromObservation: any }) => {
  const { sharedStateFromObservation } = options;

  const methods = {
    /**
     * Loads a protocol associated with an observation
     * 
     * @param observation - The observation to load the protocol for
     * @returns The loaded protocol
     */
    loadProtocol: async (observation: IObservation) => {
      const protocol = await protocolService.findOneFromObservationId(
        observation.id,
        {
          includes: [],
        }
      );

      // Update the current protocol in the shared state
      sharedState.currentProtocol = protocol;

      return protocol;
    },
    
    /**
     * Removes an item from the current protocol
     * 
     * @param itemId - ID of the item to remove
     */
    removeItem: async (itemId: string) => {
      if (!sharedState.currentProtocol?.id) {
        throw new Error('Current protocol ID is not available');
      }
      
      await protocolService.deleteItem(
        itemId,
        sharedState.currentProtocol.id
      );
      // Reload the protocol to reflect changes
      await methods.loadProtocol(
        options.sharedStateFromObservation.currentObservation
      );
    },
    
    /**
     * Adds a new category to the protocol
     * 
     * @param category - Category data to add
     */
    addCategory: async (category: AddCategoryDto) => {
      await protocolService.addCategory(category);
      // Reload the protocol to reflect changes
      await methods.loadProtocol(
        options.sharedStateFromObservation.currentObservation
      );
    },
    
    /**
     * Adds a new observable to the protocol
     * 
     * @param observable - Observable data to add
     */
    addObservable: async (observable: AddObservableDto) => {
      await protocolService.addObservable(observable);
      // Reload the protocol to reflect changes
      await methods.loadProtocol(
        options.sharedStateFromObservation.currentObservation
      );
    },
    
    /**
     * Edits an existing protocol item
     * 
     * @param item - Updated item data
     */
    editProtocolItem: async (item: EditItemDto) => {
      await protocolService.editItem(item);
      // Reload the protocol to reflect changes
      await methods.loadProtocol(
        options.sharedStateFromObservation.currentObservation
      );
    },
  };

  // Return both methods and shared state
  return {
    methods,
    sharedState,
  };
};
