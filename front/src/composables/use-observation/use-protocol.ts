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
      // Ensure reactivity by creating a new object reference
      sharedState.currentProtocol = {
        ...protocol,
        _items: protocol._items || [],
      };

      return protocol;
    },
    
    /**
     * Checks if the protocol is empty (no categories or observables)
     * 
     * @param protocol - The protocol to check
     * @returns true if the protocol is empty
     */
    isProtocolEmpty: (protocol: IProtocol | null): boolean => {
      if (!protocol || !protocol._items || !Array.isArray(protocol._items)) {
        return true;
      }
      
      // Check if there are any categories
      const hasCategories = protocol._items.some(
        (item) => item.type === 'category'
      );
      
      if (!hasCategories) {
        return true;
      }
      
      // Check if there are any observables in any category
      const hasObservables = protocol._items.some((item) => {
        if (item.type === 'category' && item.children) {
          return item.children.some((child) => child.type === 'observable');
        }
        return false;
      });
      
      return !hasObservables;
    },

    /**
     * Creates a default template for the protocol (1 category + 1 observable)
     * 
     * @returns Promise that resolves when the template is created
     */
    createDefaultTemplate: async (): Promise<void> => {
      if (!sharedState.currentProtocol?.id) {
        throw new Error('Current protocol ID is not available');
      }

      // Create default category
      const category = await protocolService.addCategory({
        protocolId: sharedState.currentProtocol.id,
        name: 'Catégorie 1',
        description: '',
        order: 0,
      });

      // Create default observable in the category
      await protocolService.addObservable({
        protocolId: sharedState.currentProtocol.id,
        parentId: category.id,
        name: 'Observable 1',
        description: '',
        order: 0,
      });

      // Reload the protocol to reflect changes
      await methods.loadProtocol(
        options.sharedStateFromObservation.currentObservation
      );
    },

    /**
     * Removes an item from the current protocol
     * After removal, checks if the protocol is empty and creates a default template if needed
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

      // Check if protocol is now empty and create default template if needed
      const reloadedProtocol = sharedState.currentProtocol;
      if (methods.isProtocolEmpty(reloadedProtocol)) {
        await methods.createDefaultTemplate();
        
        // Return a flag to indicate that a default template was created
        // This can be used by the UI to show a notification
        return { defaultTemplateCreated: true };
      }

      return { defaultTemplateCreated: false };
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
      const observation = options.sharedStateFromObservation.currentObservation;
      if (!observation?.id) {
        throw new Error('Impossible de modifier : aucune observation chargée');
      }

      try {
        await protocolService.editItem(item);
        await methods.loadProtocol(observation);
      } catch (error) {
        // Reload protocol from server to prevent persistent error state.
        try {
          await methods.loadProtocol(observation);
        } catch (reloadError) {
          console.error('Failed to reload protocol after edit error:', reloadError);
        }
        throw error;
      }
    },
  };

  // Return both methods and shared state
  return {
    methods,
    sharedState,
  };
};
