import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import { LicenseRepository } from '@core/security/repositories/license.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { Observation } from '../entities/observation.entity';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { ReadingRepository } from '../repositories/reading.repository';
import { Reading } from '../entities/reading.entity';
import { IPaginationOptions, IConditions, OperatorEnum, IPaginationOutput, TypeEnum } from '@utils/repositories/base.repositories';

@Injectable()
export class ReadingService extends BaseService<
  Reading,
  ReadingRepository
> {
  constructor(
    @InjectRepository(ReadingRepository)
    private readonly readingRepository: ReadingRepository,
  ) {
    super(readingRepository);
  }

  async findAndPaginateWithOptions(paginationOptions: IPaginationOptions,
    searchOptions?: {
      includes?: string[];
      searchString?: string;
      observationId?: number;
    }): Promise<IPaginationOutput<Reading>> {
    const relations = [...(paginationOptions.relations || []), ...(searchOptions?.includes || [])];
    
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

      if (searchOptions.searchString?.length && searchOptions.searchString !== '*') {
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
}