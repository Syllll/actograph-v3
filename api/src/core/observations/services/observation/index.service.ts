import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { BaseService } from '@utils/services/base.service';
import {
  Observation,
} from '../../entities/observation.entity';
import { ObservationType, ObservationModeEnum } from '@actograph/core';
import { ObservationRepository } from '../../repositories/obsavation.repository';
import {
  IConditions,
  IPaginationOptions,
  IPaginationOutput,
  OperatorEnum,
  TypeEnum,
} from '@utils/repositories/base.repositories';
import { Find } from './find';
import { Check } from './check';
import { ActivityGraphService } from '../activity-graph.service';
import { ProtocolService } from '../protocol/index.service';
import { ReadingService } from '../reading.service';
import { Example } from './example';
import { Export } from './export';
import { Import } from './import';
import { ProtocolItemTypeEnum, ReadingTypeEnum } from '@actograph/core';
import { ProtocolItem } from '../../entities/protocol.entity';

@Injectable()
export class ObservationService extends BaseService<
  Observation,
  ObservationRepository
> {
  public find: Find;
  public check: Check;
  public example: Example;
  public export: Export;
  public import: Import;

  constructor(
    @InjectRepository(ObservationRepository)
    private readonly observationRepository: ObservationRepository,
    private readonly protocolService: ProtocolService,
    private readonly activityGraphService: ActivityGraphService,
    private readonly readingService: ReadingService,
  ) {
    super(observationRepository);

    this.find = new Find(this, observationRepository);
    this.check = new Check(this);
    this.example = new Example(
      this,
      observationRepository,
      this.protocolService,
      this.readingService,
      this.activityGraphService,
    );
    this.export = new Export(
      this,
      observationRepository,
      this.protocolService,
      this.readingService,
    );
    this.import = new Import(this);
  }

  public async update(id: number, updateData: Partial<Observation>): Promise<Observation> {
    const observation = await this.findOne(id);
    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    const updatedObservation = {
      ...observation,
      ...updateData,
    };

    return await this.observationRepository.save(updatedObservation as Observation);
  }

  public async remove(id: number) {
    const observation = await this.findOne(id, {
      relations: ['protocol', 'activityGraph'],
    });
    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    // Remove the protocol
    if (observation.protocol) {
      await this.protocolService.delete(observation.protocol.id);
    }

    // Remove the activity graph
    if (observation.activityGraph) {
      await this.activityGraphService.delete(observation.activityGraph.id);
    }

    // Remove the readings if any
    await this.readingService.removeAllForObservation(<number>observation.id);
  }

  public override async delete(id: number): Promise<Observation | undefined> {
    // Clean up sub-entities first
    await this.remove(id);
    // Then soft-delete the observation
    return await super.delete(id);
  }

  public async clone(observationId: number, newUserId: number) {
    const observation = await this.findOne(observationId, {
      relations: ['protocol', 'activityGraph'],
    });
    if (!observation || !observation.id) {
      throw new NotFoundException('Observation not found');
    }

    // Find observation with same name
    const sameNameObservationsCount =
      await this.find.findObservationsCountWithSameName({
        userId: newUserId,
        name: observation.name ?? '',
      });
    let clonedObservationName = `${observation.name}`;
    if (sameNameObservationsCount > 0) {
      clonedObservationName = `${observation.name} (${
        sameNameObservationsCount + 1
      })`;
    }

    const _clonedObservation = this.observationRepository.create({
      ...observation,
      id: undefined,
      protocol: undefined,
      activityGraph: undefined,
      user: {
        id: newUserId,
      },
      type: ObservationType.Normal,
      name: clonedObservationName,
    });
    const clonedObservation = await this.observationRepository.save(
      _clonedObservation,
    );

    // Clone the protocol
    if (observation.protocol) {
      await this.protocolService.clone({
        protocolId: observation.protocol.id,
        observationIdToCopyTo: clonedObservation.id,
        newUserId: newUserId,
      });
    }

    // Clone the activity graph
    if (observation.activityGraph) {
      await this.activityGraphService.clone({
        activityGraphId: observation.activityGraph.id,
        observationIdToCopyTo: clonedObservation.id,
      });
    }

    // Clone the readings
    await this.readingService.cloneAndAttributeToObservation({
      observationIdToCopyFrom: observation.id,
      observationIdToCopyTo: clonedObservation.id,
    });

    return clonedObservation;
  }

  public async create(options: {
    userId: number;
    name: string;
    description?: string;
    videoPath?: string;
    mode?: ObservationModeEnum;
    protocol?: {
      name?: string;
      description?: string;
      categories?: {
        name: string;
        description?: string;
        observables?: {
          name: string;
        }[];
      }[];
    };
    readings?: {
      name: string;
      type: ReadingTypeEnum;
      dateTime: Date;
    }[];
    activityGraph?: {};
  }) {
    const observation = this.observationRepository.create({
      user: {
        id: options.userId,
      },
      name: options.name ?? 'Nouvelle observation',
      description: options.description,
      videoPath: options.videoPath,
      mode: options.mode,
      type: ObservationType.Normal,
    });
    
    const savedObservation = await this.observationRepository.save(observation);

    // Create the protocol
    if (options.protocol) {
      const protocol = await this.protocolService.create({
        observationId: savedObservation.id,
        name: options.protocol.name ?? 'Protocol - ' + savedObservation.name,
        description: options.protocol.description,
      });

      // Create the categories
      if (options.protocol.categories) {
        let categoryOrder = 0;
        for (const category of options.protocol.categories) {
          const savedCategory = await this.protocolService.items.addCategory({
            protocolId: protocol.id,
            name: category.name,
            description: category.description,
            order: categoryOrder,
          });

          // Increase the order
          categoryOrder++;

          // Create the observables
          if (category.observables) {
            for (const observable of category.observables) {
              await this.protocolService.items.addObservable({
                protocolId: protocol.id,
                categoryId: savedCategory.id,
                name: observable.name,
              });
            }
          }
        }
      }
    }

    // Create the readings
    if (options.readings) {
      await this.readingService.createMany(
        options.readings.map((r) => {
          return {
            ...r,
            observationId: savedObservation.id,
          };
        }),
      );
    }

    // Create the activity graph
    if (options.activityGraph) {
      await this.activityGraphService.create({
        observationId: savedObservation.id,
      });
    }

    return savedObservation;
  }

  /**
   * Merge two observations into a new one.
   * - Combines protocols (union of categories by name, merge observables for common categories)
   * - Copies all readings from both observations
   * - Creates a new activity graph (generated from data)
   */
  public async merge(options: {
    userId: number;
    sourceObservationId1: number;
    sourceObservationId2: number;
    name: string;
    description?: string;
  }): Promise<Observation> {
    const user = options.userId;

    // Load both observations with protocol and readings
    const obs1 = await this.findOne(options.sourceObservationId1, {
      relations: ['protocol', 'readings', 'user'],
    });
    const obs2 = await this.findOne(options.sourceObservationId2, {
      relations: ['protocol', 'readings', 'user'],
    });

    if (!obs1 || !obs2) {
      throw new NotFoundException('One or both observations not found');
    }

    // Verify ownership
    if (obs1.user?.id !== user || obs2.user?.id !== user) {
      throw new UnauthorizedException(
        'You cannot merge observations you do not own',
      );
    }

    if (obs1.id === obs2.id) {
      throw new BadRequestException(
        'Cannot merge an observation with itself',
      );
    }

    // Create the new observation
    const mergedObservation = await this.create({
      userId: user,
      name: options.name,
      description: options.description,
      protocol: this.mergeProtocols(obs1, obs2),
      readings: [],
      activityGraph: {},
    });

    // Copy readings from both observations
    const allReadings: { name: string; type: ReadingTypeEnum; dateTime: Date }[] = [];

    if (obs1.readings) {
      for (const r of obs1.readings) {
        allReadings.push({
          name: r.name ?? '',
          type: r.type,
          dateTime: r.dateTime,
        });
      }
    }
    if (obs2.readings) {
      for (const r of obs2.readings) {
        allReadings.push({
          name: r.name ?? '',
          type: r.type,
          dateTime: r.dateTime,
        });
      }
    }

    if (allReadings.length > 0) {
      await this.readingService.createMany(
        allReadings.map((r) => ({
          ...r,
          observationId: mergedObservation.id,
        })),
      );
    }

    return mergedObservation;
  }

  /**
   * Merge protocols from two observations.
   * - Takes all categories from observation 1
   * - Adds categories from observation 2 that don't exist (by name)
   * - For common categories (same name), merges observables (adds observables from obs2 that don't exist by name)
   */
  private mergeProtocols(
    obs1: Pick<Observation, 'protocol'>,
    obs2: Pick<Observation, 'protocol'>,
  ): {
    name?: string;
    description?: string;
    categories?: {
      name: string;
      description?: string;
      observables?: { name: string }[];
    }[];
  } {
    const items1 = this.parseProtocolItems(obs1.protocol?.items);
    const items2 = this.parseProtocolItems(obs2.protocol?.items);

    const mergedCategories: ProtocolItem[] = [];

    // Process categories from obs1
    for (const cat1 of items1) {
      if (cat1.type !== ProtocolItemTypeEnum.Category) continue;
      const cat2 = items2.find(
        (c) => c.type === ProtocolItemTypeEnum.Category && c.name === cat1.name,
      );
      const mergedCategory = this.mergeCategory(cat1, cat2);
      mergedCategories.push(mergedCategory);
    }

    // Add categories from obs2 that don't exist in obs1
    for (const cat2 of items2) {
      if (cat2.type !== ProtocolItemTypeEnum.Category) continue;
      const exists = mergedCategories.some((c) => c.name === cat2.name);
      if (!exists) {
        mergedCategories.push(this.cloneCategoryWithNewIds(cat2));
      }
    }

    // Convert to the format expected by create()
    return {
      categories: mergedCategories.map((cat) => ({
        name: cat.name,
        description: cat.description ?? undefined,
        observables: (cat.children ?? []).map((o) => ({ name: o.name })),
      })),
    };
  }

  private parseProtocolItems(itemsStr: string | undefined): ProtocolItem[] {
    if (!itemsStr) return [];
    try {
      return JSON.parse(itemsStr);
    } catch {
      return [];
    }
  }

  private mergeCategory(
    cat1: ProtocolItem,
    cat2: ProtocolItem | undefined,
  ): ProtocolItem {
    const base = this.cloneCategoryWithNewIds(cat1);
    if (!cat2?.children) return base;

    const existingNames = new Set(
      (base.children ?? []).map((o) => o.name.toLowerCase()),
    );
    for (const obs of cat2.children) {
      if (obs.type === ProtocolItemTypeEnum.Observable) {
        if (!existingNames.has(obs.name.toLowerCase())) {
          base.children = base.children ?? [];
          base.children.push({
            ...obs,
            id: randomUUID(),
          });
          existingNames.add(obs.name.toLowerCase());
        }
      }
    }
    return base;
  }

  private cloneCategoryWithNewIds(cat: ProtocolItem): ProtocolItem {
    return {
      ...cat,
      id: randomUUID(),
      children: (cat.children ?? []).map((o) => ({
        ...o,
        id: randomUUID(),
      })),
    };
  }
}
