import { ProtocolRepository } from '@core/observations/repositories/protocol.repository';
import { ProtocolService } from './index.service';
import { InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ProtocolItem, ProtocolItemActionEnum, ProtocolItemTypeEnum } from '@core/observations/entities/protocol.entity';
import { randomUUID } from 'node:crypto';

export class Items {
  constructor(
    private readonly protocolService: ProtocolService,
    private readonly protocolRepository: ProtocolRepository,
  ) {}

  public getItemsAsJson(itemsStr: string | undefined): ProtocolItem[] {
    if (!itemsStr) {
      throw new InternalServerErrorException('itemsStr is undefined, it should not.')
    }

    return JSON.parse(itemsStr);
  }

  public async addCategory(options: {
    protocolId: number,
    order: number,
    name: string,
    description?: string,
    action?: ProtocolItemActionEnum,
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

  public async removeCategory(options: {
    protocolId: number,
    categoryId: string,
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
    const categoryIndex = categories.findIndex(c => c.id === options.categoryId);

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
    protocolId: number,
    categoryId: string,
    name?: string,
    description?: string,
    action?: ProtocolItemActionEnum,
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
    const categoryIndex = categories.findIndex(c => c.id === options.categoryId);

    if (categoryIndex === -1) {
      throw new NotFoundException('Category was not found');
    }

    // Edit the category
    categories[categoryIndex] = {
      ...categories[categoryIndex],
      ...options,
    };
    
    // Update the protocol with the new items
    protocol.items = JSON.stringify(categories);

    // Save the protocol
    await this.protocolRepository.save(protocol);

    // Return the new items
    return categories[categoryIndex];
  }

  public async addObservable(options: {
    protocolId: number,
    categoryId: string,
    name: string,
    description?: string,
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
    const categoryIndex = categories.findIndex(c => c.id === options.categoryId); 

    if (categoryIndex === -1) {
      throw new NotFoundException('Category was not found');
    }

    // Get the category
    const category = categories[categoryIndex];

    // Add the observable to the category
    if (!category.children) {
      category.children = [];
    }
    
    category.children.push({
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
    protocolId: number,
    categoryId: string,
    observableId: string,
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
    const categoryIndex = categories.findIndex(c => c.id === options.categoryId);
    
    if (categoryIndex === -1) {
      throw new NotFoundException('Category was not found');
    }

    // Get the category
    const category = categories[categoryIndex];

    if (!category.children) {
      throw new NotFoundException('Category has no observables');
    }
    
    // Find the observable to remove
    const observableIndex = category.children.findIndex(o => o.id === options.observableId);

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
    protocolId: number,
    categoryId: string,
    observableId: string,
    name?: string,
    description?: string,
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
    const categoryIndex = categories.findIndex(c => c.id === options.categoryId);

    if (categoryIndex === -1) {
      throw new NotFoundException('Category was not found');
    }

    // Get the category
    const category = categories[categoryIndex];

    if (!category.children) {
      throw new NotFoundException('Category has no observables');
    }

    // Find the observable
    const observableIndex = category.children.findIndex(o => o.id === options.observableId);

    if (observableIndex === -1) {
      throw new NotFoundException('Observable was not found');
    }

    // Edit the observable
    category.children[observableIndex] = {
      ...category.children[observableIndex],
      ...options,
    };
    
    // Update the protocol with the new items
    protocol.items = JSON.stringify(categories);

    // Save the protocol
    await this.protocolRepository.save(protocol);

    // Return the new items
    return category.children[observableIndex];
  }
}