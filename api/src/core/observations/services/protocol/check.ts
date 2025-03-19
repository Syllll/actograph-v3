import { ProtocolRepository } from '@core/observations/repositories/protocol.repository';
import { ProtocolService } from './index.service';

export class Check {
  constructor(
    private readonly protocolService: ProtocolService,
    private readonly protocolRepository: ProtocolRepository,
  ) {}

  public canAccess(options: {
    userId: number;
    protocolId: number;
    throwError?: boolean;
  }) {
    const {
      userId,
      protocolId,
      throwError = false,
    } = options;

    
  }
}