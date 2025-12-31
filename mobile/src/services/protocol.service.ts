import {
  protocolRepository,
  type IProtocolItemEntity,
  type IProtocolItemWithChildren,
} from '@database/repositories/protocol.repository';

export interface IUpdateProtocolItemInput {
  name?: string;
  color?: string;
  action?: string;
  displayMode?: string;
  backgroundPattern?: string;
  sortOrder?: number;
}

/**
 * Service for managing protocols
 */
class ProtocolService {
  /**
   * Get protocol items for an observation
   */
  async getByObservationId(observationId: number): Promise<IProtocolItemWithChildren[]> {
    const protocol = await protocolRepository.findByObservationId(observationId);
    if (!protocol) {
      return [];
    }
    return protocolRepository.getProtocolItems(protocol.id);
  }

  /**
   * Add a category to an observation's protocol
   */
  async addCategory(
    observationId: number,
    name: string,
    action = 'continuous'
  ): Promise<IProtocolItemEntity> {
    const protocol = await protocolRepository.findByObservationId(observationId);
    if (!protocol) {
      throw new Error(`Le protocole pour l'observation ${observationId} n'existe pas`);
    }

    // Get current max sort order
    const items = await protocolRepository.getProtocolItems(protocol.id);
    const maxSortOrder = items.length > 0
      ? Math.max(...items.map((item) => item.sort_order))
      : -1;

    const result = await protocolRepository.addCategory(protocol.id, name, maxSortOrder + 1, action);
    if (!result) {
      throw new Error('Impossible de créer la catégorie');
    }
    return result;
  }

  /**
   * Add an observable to a category
   */
  async addObservable(
    observationId: number,
    categoryId: number,
    name: string,
    color?: string
  ): Promise<IProtocolItemEntity | null> {
    const protocol = await protocolRepository.findByObservationId(observationId);
    if (!protocol) {
      return null;
    }

    return protocolRepository.addObservable(protocol.id, categoryId, name, color);
  }

  /**
   * Update a protocol item
   */
  async updateItem(itemId: number, data: IUpdateProtocolItemInput): Promise<IProtocolItemEntity | null> {
    return protocolRepository.updateItem(itemId, {
      name: data.name,
      color: data.color,
      action: data.action,
      display_mode: data.displayMode,
      background_pattern: data.backgroundPattern,
      sort_order: data.sortOrder,
    });
  }

  /**
   * Delete a protocol item
   */
  async deleteItem(itemId: number): Promise<boolean> {
    return protocolRepository.deleteItem(itemId);
  }

  /**
   * Clear all items from a protocol
   */
  async clearProtocol(observationId: number): Promise<void> {
    const protocol = await protocolRepository.findByObservationId(observationId);
    if (protocol) {
      await protocolRepository.clearItems(protocol.id);
    }
  }

  /**
   * Get flat list of observables for an observation
   */
  async getObservables(observationId: number): Promise<{ id: number; name: string; categoryName: string; color?: string }[]> {
    const items = await this.getByObservationId(observationId);
    const observables: { id: number; name: string; categoryName: string; color?: string }[] = [];

    for (const category of items) {
      if (category.type === 'category' && category.children) {
        for (const observable of category.children) {
          if (observable.type === 'observable') {
            observables.push({
              id: observable.id,
              name: observable.name,
              categoryName: category.name,
              color: observable.color,
            });
          }
        }
      }
    }

    return observables;
  }
}

// Singleton instance
export const protocolService = new ProtocolService();

