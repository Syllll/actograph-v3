import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import { LicenseRepository } from '@core/security/repositories/license.repository';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { Observation } from '../entities/observation.entity';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { Reading, ReadingTypeEnum } from '../entities/reading.entity';
import {
  IPaginationOptions,
  IConditions,
  OperatorEnum,
  IPaginationOutput,
  TypeEnum,
} from '@utils/repositories/base.repositories';
import { ObservationService } from './observation/index.service';

@Injectable()
export class ReadingService extends BaseService<Reading, ReadingRepository> {
  constructor(
    @InjectRepository(ReadingRepository)
    private readonly readingRepository: ReadingRepository,
    @Inject(forwardRef(() => ObservationService))
    private readonly observationService: ObservationService,
  ) {
    super(readingRepository);
  }

  async findAndPaginateWithOptions(
    paginationOptions: IPaginationOptions,
    searchOptions?: {
      includes?: string[];
      searchString?: string;
      observationId?: number;
    },
  ): Promise<IPaginationOutput<Reading>> {
    const relations = [
      ...(paginationOptions.relations || []),
      ...(searchOptions?.includes || []),
    ];

    const conditions: IConditions[] = [];

    if (searchOptions) {
      if (searchOptions.observationId) {
        if (!relations.includes('observation')) {
          relations.push('observation');
        }

        conditions.push({
          type: TypeEnum.AND,
          key: 'observation.id',
          operator: OperatorEnum.EQUAL,
          value: searchOptions.observationId,
        });
      }

      if (
        searchOptions.searchString?.length &&
        searchOptions.searchString !== '*'
      ) {
        conditions.push({
          type: TypeEnum.AND,
          key: 'observation.name',
          operator: OperatorEnum.LIKE,
          value: searchOptions.searchString,
        });
      }
    }

    return this.findAndPaginate({
      ...paginationOptions,
      relations,
      conditions,
    });
  }

  public async create(options: {
    name: string;
    description?: string;
    observationId: number;
    type: ReadingTypeEnum;
    dateTime: Date;
  }) {
    const reading = this.readingRepository.create({
      name: options.name,
      description: options.description,
      observation: {
        id: options.observationId,
      },
      type: options.type,
      dateTime: options.dateTime,
    });
    return this.readingRepository.save(reading);
  }

  // Create several readings at once
  public async createMany(
    readings: {
      tempId?: string | null;
      name: string;
      description?: string | null;
      observationId: number;
      type: ReadingTypeEnum;
      dateTime: Date;
    }[]
  ) {
    const _readings = this.readingRepository.create(
      readings.map((r) => {
        return {
          name: r.name,
          description: r.description,
          observation: {
            id: r.observationId,
          },
          type: r.type,
          dateTime: r.dateTime,
          tempId: r.tempId,
        };
      }),
    );
    _readings.forEach((r) => {
      r.id = r.id;
    });
    return this.readingRepository.save(_readings);
  }

  public async removeAllForObservation(observationId: number) {
    const readings = await this.readingRepository.find({
      where: { observation: { id: observationId } },
    });
    if (readings.length > 0) {
      await this.readingRepository.softRemove(readings);
    }
  }

  public async cloneAndAttributeToObservation(options: {
    observationIdToCopyFrom: number;
    observationIdToCopyTo: number;
  }) {
    // Find the readings to clone
    const readings = await this.readingRepository.find({
      where: { observation: { id: options.observationIdToCopyFrom } },
    });
    console.log('readings', readings);
    if (readings.length === 0) {
      return;
    }

    // Clone the readings
    const clonedReadings = await this.createMany(
      readings.map((r) => {
        return {
          name: r.name ?? '',
          description: r.description ?? '',
          observationId: options.observationIdToCopyTo,
          type: r.type,
          dateTime: r.dateTime,
        };
      }),
    );
  }

  public async removeMany(readings: ({
    id: number;
  })[]) {
    await this.readingRepository.softRemove(readings);
  }

  public async updateMany(readings: {
    id?: number;
    tempId?: string | null;
    name?: string;
    description?: string | null;
    type?: ReadingTypeEnum;
    dateTime?: Date;
  }[], observationId: number) {
    const readingsToSave = [];
    for (const reading of readings) {
      if (reading.id) {
        readingsToSave.push(reading);
      } else {
        if (!reading.tempId) {
          throw new BadRequestException('Temp ID is required');
        }
        const existingReading = await this.readingRepository.findOne({
          where: { tempId: reading.tempId, observation: { id: observationId } },
        });
        if (!existingReading) {
          throw new NotFoundException('Reading not found with temp ID ' + reading.tempId);
        }

        readingsToSave.push(existingReading);
      }
    }
    
    await this.readingRepository.save(readingsToSave);
  }
}
