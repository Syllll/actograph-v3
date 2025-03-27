import { IObservation } from '@services/observations/interface';
import {
  AddCategoryDto,
  AddObservableDto,
  EditItemDto,
  ProtocolItem,
  protocolService,
} from '@services/observations/protocol.service';

export const useProtocol = (options: { sharedStateFromObservation: any }) => {
  const { sharedStateFromObservation } = options;

  const methods = {
    loadProtocol: async (observation: IObservation) => {
      const protocol = await protocolService.findOneFromObservationId(
        observation.id,
        {
          includes: [],
        }
      );
      if (protocol.items) {
        protocol._items = JSON.parse(protocol.items);
      }

      options.sharedStateFromObservation.currentProtocol = protocol;

      return protocol;
    },
    removeItem: async (itemId: string) => {
      await protocolService.deleteItem(
        itemId,
        sharedStateFromObservation.currentProtocol.id
      );
      await methods.loadProtocol(
        options.sharedStateFromObservation.currentObservation
      );
    },
    addCategory: async (category: AddCategoryDto) => {
      await protocolService.addCategory(category);
      await methods.loadProtocol(
        options.sharedStateFromObservation.currentObservation
      );
    },
    addObservable: async (observable: AddObservableDto) => {
      await protocolService.addObservable(observable);
      await methods.loadProtocol(
        options.sharedStateFromObservation.currentObservation
      );
    },
    editProtocolItem: async (item: EditItemDto) => {
      await protocolService.editItem(item);
      await methods.loadProtocol(
        options.sharedStateFromObservation.currentObservation
      );
    },
  };

  return {
    methods,
  };
};
