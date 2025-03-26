import { ProtocolRepository } from '@core/observations/repositories/protocol.repository';
import { ProtocolService } from './index.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
export class Check {
  constructor(
    private readonly protocolService: ProtocolService,
    private readonly protocolRepository: ProtocolRepository,
  ) {}

  public async canAccess(options: {
    userId: number;
    protocolId: number;
    throwError?: boolean;
  }) {
    const {
      userId,
      protocolId,
      throwError = true,
    } = options;

    const protocol = await this.protocolRepository.findOne({
      where: {
        id: protocolId,
      },
      relations: ['observation', 'observation.user'],
    });

    if (!protocol) {
      if (throwError) {
        throw new NotFoundException('Protocol not found');
      }
      return false;
    }

    if (protocol.observation?.user?.id !== userId) {
      if (throwError) {
        throw new UnauthorizedException('You are not allowed to access this protocol');
      }
      return false;
    }

    return true;
  }
}