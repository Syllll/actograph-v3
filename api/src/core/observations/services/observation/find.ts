import { Observation } from '@core/observations/entities/observation.entity';
import {
  IPaginationOptions,
  IPaginationOutput,
  IConditions,
  TypeEnum,
  OperatorEnum,
} from '@utils/repositories/base.repositories';
import { ObservationService } from './index.service';
import { ObservationRepository } from '@core/observations/repositories/obsavation.repository';

export class Find {
  constructor(
    private observationService: ObservationService,
    private observationRepository: ObservationRepository,
  ) {}

  // Return the number of observations with the same name, for a given user and excluding the last ({number})
  async findObservationsCountWithSameName(options: {
    userId: number;
    name: string;
  }): Promise<number> {
    // Extract the base name (removing any trailing numbering pattern)
    const baseName = options.name.replace(/\s*\(\d+\)$/, '');

    // Find observations with the same base name
    const observations = await this.observationRepository.find({
      where: {
        user: { id: options.userId },
      },
    });

    // Count observations that match the base name or follow the pattern "baseName (n)"
    const namePattern = new RegExp(`^${baseName}(\\s*\\(\\d+\\))?$`);
    const matchingObservations = observations.filter((obs) =>
      namePattern.test(obs.name),
    );

    return matchingObservations.length;
  }

  async findAllForUser(userId: number): Promise<Observation[]> {
    return this.observationRepository.find({
      where: {
        user: { id: userId },
      },
    });
  }

  async findAndPaginateWithOptions(
    paginationOptions: IPaginationOptions,
    searchOptions?: {
      includes?: string[];
      userId?: number;
      searchString?: string;
      observationId?: number;
    },
  ): Promise<IPaginationOutput<Observation>> {
    const relations = [
      ...(paginationOptions.relations || []),
      ...(searchOptions?.includes || []),
    ];

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
        conditions.push({
          type: TypeEnum.AND,
          key: 'id',
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
          key: 'name',
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
