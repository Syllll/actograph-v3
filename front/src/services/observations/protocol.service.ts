import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import {
  PaginationOptions,
  PaginationResponse,
} from '@lib-improba/utils/pagination.utils';
import { IUser } from '@services/users/user.interface';
import { IProtocol } from './interface';

const apiUrl = httpUtils.apiUrl();

// Define protocol item types and actions to match backend
export enum ProtocolItemTypeEnum {
  Category = 'category',
  Observable = 'observable',
}

export enum ProtocolItemActionEnum {
  Continuous = 'continuous',
  Discrete = 'discrete',
}

// Interface for protocol items
export interface ProtocolItem {
  id: string;
  name: string;
  description?: string;
  type: ProtocolItemTypeEnum;
  action?: ProtocolItemActionEnum;
  meta?: Record<string, any>;
  children?: ProtocolItem[];
}

// DTOs for API requests
export interface AddCategoryDto {
  name: string;
  description?: string;
  action?: ProtocolItemActionEnum;
  type: ProtocolItemTypeEnum.Category;
  protocolId: number;
  order?: number;
}

export interface AddObservableDto {
  name: string;
  description?: string;
  type: ProtocolItemTypeEnum.Observable;
  protocolId: number;
  parentId: string; // Category ID
  order?: number;
}

export interface EditItemDto {
  id: string;
  protocolId: number;
  name?: string;
  description?: string;
  action?: ProtocolItemActionEnum;
  type: ProtocolItemTypeEnum;
  order?: number;
}

export const protocolService = {
  /**
   * Get protocols with pagination
   */
  async findWithPagination(
    options: PaginationOptions,
    search?: {
      searchString?: string;
    }
  ): Promise<PaginationResponse<IProtocol>> {
    const response = await api().get(
      `${apiUrl}/observations/protocols/paginate`,
      {
        params: {
          ...options,
          ...search,
        },
      }
    );

    return response.data;
  },

  /**
   * Get protocol from observation ID
   */
  findOneFromObservationId: async (
    observationId: number,
    options?: {
      includes?: string[];
    }
  ): Promise<IProtocol> => {
    const params = options?.includes
      ? { includes: options.includes.join(',') }
      : {};
    const response = await api().get(
      `${apiUrl}/observations/protocols/from-observation/${observationId}`,
      { params }
    );

    // Parse the items JSON string into an object
    const protocol = response.data;
    
    // Ensure _items is always defined for reactivity
    if (protocol && protocol.items) {
      try {
        const parsedItems = JSON.parse(protocol.items);
        // Use Object.assign to ensure reactivity works correctly
        protocol._items = Array.isArray(parsedItems) ? parsedItems : [];
      } catch (e) {
        console.error('Failed to parse protocol items:', e);
        protocol._items = [];
      }
    } else {
      // If protocol.items is null, undefined, or empty, set _items to empty array
      // This ensures the component can check for _items existence
      protocol._items = [];
    }

    return protocol;
  },

  /**
   * Add a category to the protocol
   */
  addCategory: async (
    data: Omit<AddCategoryDto, 'type'>
  ): Promise<ProtocolItem> => {
    const response = await api().post(`${apiUrl}/observations/protocols/item`, {
      ...data,
      type: ProtocolItemTypeEnum.Category,
    });
    return response.data;
  },

  /**
   * Add an observable to a category
   */
  addObservable: async (
    data: Omit<AddObservableDto, 'type'>
  ): Promise<ProtocolItem> => {
    const response = await api().post(`${apiUrl}/observations/protocols/item`, {
      ...data,
      type: ProtocolItemTypeEnum.Observable,
    });
    return response.data;
  },

  /**
   * Edit a protocol item (category or observable)
   */
  editItem: async (
    data: Omit<EditItemDto, 'type'> & { type: ProtocolItemTypeEnum }
  ): Promise<ProtocolItem> => {
    const response = await api().patch(
      `${apiUrl}/observations/protocols/item/${data.id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a protocol item (category or observable)
   */
  deleteItem: async (itemId: string, protocolId: number): Promise<void> => {
    const response = await api().delete(
      `${apiUrl}/observations/protocols/item/${protocolId}/${itemId}`
    );
    return response.data;
  },

  /**
   * Helper function to parse protocol items
   */
  parseProtocolItems: (protocol: IProtocol): ProtocolItem[] => {
    if (!protocol || !protocol.items) {
      return [];
    }

    try {
      return JSON.parse(protocol.items);
    } catch (e) {
      console.error('Failed to parse protocol items:', e);
      return [];
    }
  },
};
