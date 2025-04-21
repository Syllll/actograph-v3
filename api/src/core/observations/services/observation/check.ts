import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ObservationService } from './index.service';

export class Check {
  constructor(private readonly observationService: ObservationService) {}

  /**
   * Check if a user can access an observation
   * @param options
   * @param options.observationId - The id of the observation
   * @param options.userId - The id of the user
   * @param options.throwError - If true, throw an error if the user cannot access the observation (default: true)
   * @returns True if the user can access the observation, false otherwise
   */
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
