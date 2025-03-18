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
import { Protocol } from '../entities/protocol.entity';
import { ProtocolRepository } from '../repositories/protocol.repository';
import { IPaginationOptions, IPaginationOutput, IConditions, OperatorEnum, TypeEnum } from '@utils/repositories/base.repositories';

@Injectable()
  export class ProtocolService extends BaseService<
  Protocol,
  ProtocolRepository
> {
  constructor(
    @InjectRepository(ProtocolRepository)
    private readonly protocolRepository: ProtocolRepository,
  ) {
    super(protocolRepository);
  }

  async findAndPaginateWithOptions(paginationOptions: IPaginationOptions,
    searchOptions?: {
      includes?: string[];
      searchString?: string;
      userId?: number;
      observationId?: number;
    }): Promise<IPaginationOutput<Protocol>> {
    const relations = [...(paginationOptions.relations || []), ...(searchOptions?.includes || [])];
    
    const conditions: IConditions[] = [];

    if (searchOptions) {
      if (searchOptions.userId) {
        if (!relations.includes('user')) {
          relations.push('user');
        }

        conditions.push({
          type: TypeEnum.AND,
          key: 'user.id',
          operator: OperatorEnum.EQUAL,
          value: searchOptions.userId,
        });
      }

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