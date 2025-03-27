import { ProtocolRepository } from '@core/observations/repositories/protocol.repository';
import { ProtocolService } from './index.service';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ProtocolItem,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '@core/observations/entities/protocol.entity';
import { randomUUID } from 'node:crypto';

export class Items {
  constructor(
    private readonly protocolService: ProtocolService,
    private readonly protocolRepository: ProtocolRepository,
  ) {}

  public getItemsAsJson(itemsStr: string | undefined): ProtocolItem[] {
    if (!itemsStr) {
      throw new InternalServerErrorException(
        'itemsStr is undefined, it should not.',
      );
    }

    return JSON.parse(itemsStr);
  }

  public async addCategory(options: {
    protocolId: number;
    order: number;
    name: string;
    description?: string;
    action?: ProtocolItemActionEnum;
  }) {
    // Find the protocol
    const protocol = await this.protocolService.findOne(options.protocolId, {
      relations: ['user'],
    });
    if (!protocol) {
      throw new NotFoundException('Protocol was  not found');
    }

    // Get the array of categories
    const categories = this.getItemsAsJson(protocol.items);

    // Get the uuid of our new item
    const id = randomUUID();

    let order = options.order;

    // Insert the new category at the given order. If the order is not valid, adjust it.
    if (order < 0) {
      order = 0;
    } else if (order > categories.length) {
      order = categories.length;
    }

    // Insert the new category at the given order.
    categories.splice(order, 0, {
      id,
      name: options.name,
      action: options.action || ProtocolItemActionEnum.Continuous,
      description: options.description,
      type: ProtocolItemTypeEnum.Category,
    });

    // Update the protocol with the new items
    protocol.items = JSON.stringify(categories);

    // Save the protocol
    await this.protocolRepository.save(protocol);

    // Return the new category
    return categories[order];
  }

  public async removeItem(options: { protocolId: number; itemId: string }) {
    // Find the protocol
    const protocol = await this.protocolService.findOne(options.protocolId, {
      relations: [],
    });
    if (!protocol) {
      throw new NotFoundException('Protocol was not found');
    }

    // Get the array of items
    const items = this.getItemsAsJson(protocol.items);

    const findAndRemoveItemFromJson = (items: ProtocolItem[], id: string) => {
      // Loop through the items and find the item to remove
      for (const item of items) {
        if (item.id === id) {
          // Remove the item
          items.splice(items.indexOf(item), 1);
          return;
        }

        if (item.children) {
          for (const child of item.children) {
            if (child.id === id) {
              item.children.splice(item.children.indexOf(child), 1);
              return;
            }
          }
        }
      }

      throw new NotFoundException('Item was not found');
    };

    findAndRemoveItemFromJson(items, options.itemId);

    // Update the protocol with the new items
    protocol.items = JSON.stringify(items);

    // Save the protocol
    await this.protocolRepository.save(protocol);
  }

  public async removeCategory(options: {
    protocolId: number;
    categoryId: string;
  }) {
    // Find the protocol
    const protocol = await this.protocolService.findOne(options.protocolId, {
      relations: ['user'],
    });
    if (!protocol) {
      throw new NotFoundException('Protocol was not found');
    }

    // Get the array of categories
    const categories = this.getItemsAsJson(protocol.items);

    // Find the category to remove
    const categoryIndex = categories.findIndex(
      (c) => c.id === options.categoryId,
    );

    if (categoryIndex === -1) {
      throw new NotFoundException('Category was not found');
    }

    // Remove the category
    categories.splice(categoryIndex, 1);

    // Update the protocol with the new items
    protocol.items = JSON.stringify(categories);

    // Save the protocol
    await this.protocolRepository.save(protocol);

    // Return the new items
    return categories;
  }

  public async editCategory(options: {
    protocolId: number;
    categoryId: string;
    name?: string;
    description?: string;
    action?: ProtocolItemActionEnum;
    order?: number;
  }) {
    // Find the protocol
    const protocol = await this.protocolService.findOne(options.protocolId, {
      relations: ['user'],
    });
    if (!protocol) {
      throw new NotFoundException('Protocol was not found');
    }

    // Get the array of categories
    const categories = this.getItemsAsJson(protocol.items);

    // Find the category to edit
    const categoryIndex = categories.findIndex(
      (c) => c.id === options.categoryId,
    );

    if (categoryIndex === -1) {
      throw new NotFoundException('Category was not found');
    }

    // Create a copy of the category with updated properties
    const updatedCategory = {
      ...categories[categoryIndex],
      ...options,
    };

    // Handle order change if specified
    if (options.order !== undefined && options.order !== categoryIndex) {
      let newOrder = options.order;

      // Validate and adjust the order if needed
      if (newOrder < 0) {
        newOrder = 0;
      } else if (newOrder >= categories.length) {
        newOrder = categories.length - 1;
      }

      // Remove the category from its current position
      categories.splice(categoryIndex, 1);

      // Insert it at the new position
      categories.splice(newOrder, 0, updatedCategory);
    } else {
      // Just update the category in place
      categories[categoryIndex] = updatedCategory;
    }

    // Update the protocol with the new items
    protocol.items = JSON.stringify(categories);

    // Save the protocol
    await this.protocolRepository.save(protocol);

    // Find the new index of the category (in case order changed)
    const newCategoryIndex = categories.findIndex(
      (c) => c.id === options.categoryId,
    );

    // Return the updated category
    return categories[newCategoryIndex];
  }

  public async addObservable(options: {
    protocolId: number;
    categoryId: string;
    name: string;
    description?: string;
    order?: number;
  }) {
    // Find the protocol
    const protocol = await this.protocolService.findOne(options.protocolId, {
      relations: [],
    });
    if (!protocol) {
      throw new NotFoundException('Protocol was not found');
    }

    // Get the array of categories
    const categories = this.getItemsAsJson(protocol.items);

    // Find the category
    const categoryIndex = categories.findIndex(
      (c) => c.id === options.categoryId,
    );

    if (categoryIndex === -1) {
      throw new NotFoundException('Category was not found');
    }

    // Get the category
    const category = categories[categoryIndex];

    // Add the observable to the category
    if (!category.children) {
      category.children = [];
    }

    let order = options.order || category.children.length;

    if (order < 0) {
      order = 0;
    } else if (order > category.children.length) {
      order = category.children.length;
    }

    category.children.splice(order, 0, {
      id: randomUUID(),
      name: options.name,
      description: options.description,
      type: ProtocolItemTypeEnum.Observable,
    });

    // Update the protocol with the new items
    protocol.items = JSON.stringify(categories);

    // Save the protocol
    await this.protocolRepository.save(protocol);

    // Return the added observable
    return category.children[category.children.length - 1];
  }

  public async removeObservable(options: {
    protocolId: number;
    observableId: string;
  }) {
    // Find the protocol
    const protocol = await this.protocolService.findOne(options.protocolId, {
      relations: [],
    });
    if (!protocol) {
      throw new NotFoundException('Protocol was not found');
    }

    // Get the array of categories
    const categories = this.getItemsAsJson(protocol.items);

    // Find the categorie of the observable to remove
    const categoryIndex = categories.findIndex((c) =>
      c.children?.find((o) => o.id === options.observableId),
    );

    if (categoryIndex === -1) {
      throw new NotFoundException('Observable was not found');
    }

    // Get the category
    const category = categories[categoryIndex];

    if (!category.children) {
      throw new NotFoundException('Category has no observables');
    }

    // Find the observable to remove
    const observableIndex = category.children.findIndex(
      (o) => o.id === options.observableId,
    );

    if (observableIndex === -1) {
      throw new NotFoundException('Observable was not found');
    }

    // Remove the observable
    category.children.splice(observableIndex, 1);

    // Update the protocol with the new items
    protocol.items = JSON.stringify(categories);

    // Save the protocol
    await this.protocolRepository.save(protocol);

    // Return the new items
    return categories;
  }

  public async editObservable(options: {
    protocolId: number;
    observableId: string;
    name?: string;
    description?: string;
    order?: number;
  }) {
    // Find the protocol
    const protocol = await this.protocolService.findOne(options.protocolId, {
      relations: [],
    });
    if (!protocol) {
      throw new NotFoundException('Protocol was not found');
    }

    // Get the array of categories
    const categories = this.getItemsAsJson(protocol.items);

    // Find the category
    const categoryIndex = categories.findIndex((c) =>
      c.children?.find((o) => o.id === options.observableId),
    );

    if (categoryIndex === -1) {
      throw new NotFoundException('Category was not found');
    }

    // Get the category
    const category = categories[categoryIndex];

    if (!category.children) {
      throw new NotFoundException('Category has no observables');
    }

    // Find the observable
    const observableIndex = category.children.findIndex(
      (o) => o.id === options.observableId,
    );

    if (observableIndex === -1) {
      throw new NotFoundException('Observable was not found');
    }

    // Create a copy of the observable to edit
    const updatedObservable = {
      ...category.children[observableIndex],
      ...options,
    };

    // Handle order change if specified
    if (options.order !== undefined && options.order !== observableIndex) {
      let newOrder = options.order;

      // Validate and adjust the order if needed
      if (newOrder < 0) {
        newOrder = 0;
      } else if (newOrder >= category.children.length) {
        newOrder = category.children.length - 1;
      }

      // Remove the observable from its current position
      category.children.splice(observableIndex, 1);

      // Insert it at the new position
      category.children.splice(newOrder, 0, updatedObservable);
    } else {
      // Just update the observable in place
      category.children[observableIndex] = updatedObservable;
    }

    // Update the protocol with the new items
    protocol.items = JSON.stringify(categories);

    // Save the protocol
    await this.protocolRepository.save(protocol);

    // Find the new index of the observable (in case order changed)
    const newObservableIndex = category.children.findIndex(
      (o) => o.id === options.observableId,
    );

    // Return the updated observable
    return category.children[newObservableIndex];
  }
}
