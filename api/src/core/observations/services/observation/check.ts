import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ObservationService } from './index.service';

export class Check {
  constructor(private readonly observationService: ObservationService) {}

  public async canUserAccessObservation(options: {
    observationId: number;
    userId: number;
    throwError?: boolean;
  }): Promise<boolean> {
    const { observationId, userId, throwError = true } = options;

    const observation = await this.observationService.findOne(observationId, {
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
        throw new UnauthorizedException(
          'You are not allowed to access this observation',
        );
      }

      return false;
    }

    return true;
  }
}
