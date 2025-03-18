import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { Observation } from '../entities/observation.entity';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { IConditions, IPaginationOptions, IPaginationOutput, OperatorEnum, TypeEnum } from '@utils/repositories/base.repositories';

@Injectable()
export class ObservationService extends BaseService<
  Observation,
  ObservationRepository
> {
  constructor(
    @InjectRepository(ObservationRepository)
    private readonly observationRepository: ObservationRepository,
  ) {
    super(observationRepository);
  }

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

    return this.findAndPaginate({
      ...paginationOptions,
      relations,
      conditions,
    });
  }

  public async checkObservationBelongsToUser(options: {
    observationId: number;
    userId: number;
    throwError?: boolean;
  }): Promise<boolean> {
    const { observationId, userId, throwError = true } = options;

    const observation = await this.findOne(observationId, {
      relations: ['user'],
    });
    
    if (!observation) {
      if (throwError) {
        throw new NotFoundException('Observation not found');
      }

      return false;
    }

    if (observation.user?.id !== userId) {
      if (throwError) {
        throw new UnauthorizedException('You are not allowed to access this observation');
      }

      return false;
    }

    return true;
  }
}