import { Observation } from '@core/observations/entities/observation.entity';
import { IPaginationOptions, IPaginationOutput, IConditions, TypeEnum, OperatorEnum } from '@utils/repositories/base.repositories';
import { ObservationService } from './index.service';
import { ObservationRepository } from '@core/observations/repositories/obsavation.repository';

export class Find {
  constructor(
    private observationService: ObservationService,
    private observationRepository: ObservationRepository,
  ) {}

  async findAllForuser(userId: number): Promise<Observation[]> {
    return this.observationRepository.find({
      where: {
        user: { id: userId },
      },
    });
  }

  async findAndPaginateWithOptions(paginationOptions: IPaginationOptions,
    searchOptions?: {
      includes?: string[];
      userId?: number;
      searchString?: string;
      observationId?: number;
    }): Promise<IPaginationOutput<Observation>> {
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

    return this.observationService.findAndPaginate({
      ...paginationOptions,
      relations,
      conditions,
    });
  }
}