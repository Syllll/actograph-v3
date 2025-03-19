import { ProtocolRepository } from '@core/observations/repositories/protocol.repository';
import { ProtocolService } from './index.service';
import { Protocol } from '@core/observations/entities/protocol.entity';
import { IPaginationOptions, IPaginationOutput, IConditions, TypeEnum, OperatorEnum } from '@utils/repositories/base.repositories';

export class Find {
  constructor(
    private readonly protocolService: ProtocolService,
    private readonly protocolRepository: ProtocolRepository,
  ) {}

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

    return this.protocolService.findAndPaginate({
      ...paginationOptions,
      relations,
      conditions,
    });
  }
}