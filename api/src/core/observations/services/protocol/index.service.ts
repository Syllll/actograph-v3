import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { Protocol } from '../../entities/protocol.entity';
import { ProtocolRepository } from '../../repositories/protocol.repository';
import { Find } from './find';
import { Check } from './check';
import { Items } from './items';
import { NotFoundException } from '@nestjs/common';
import {
  lockActiveObservationWrite,
  withObservationWriteLocks,
} from '../observation-write-lock';

@Injectable()
export class ProtocolService extends BaseService<Protocol, ProtocolRepository> {
  public find: Find;
  public check: Check;
  public items: Items;

  constructor(
    @InjectRepository(ProtocolRepository)
    private readonly protocolRepository: ProtocolRepository,
  ) {
    super(protocolRepository);

    this.find = new Find(this, protocolRepository);
    this.check = new Check(this, protocolRepository);
    this.items = new Items(this, protocolRepository);
  }

  public async create(options: {
    name: string;
    description?: string;
    observationId: number;
  }) {
    const protocol = await this.protocolRepository.create({
      name: options.name,
      description: options.description,
      observation: {
        id: options.observationId,
      },
    });
    return this.protocolRepository.save(protocol);
  }

  public async clone(options: {
    protocolId: number;
    observationIdToCopyTo: number;
    newUserId: number;
  }) {
    return withObservationWriteLocks(
      this.protocolRepository.manager.connection,
      [options.observationIdToCopyTo],
      () =>
        this.protocolRepository.manager.transaction(async (manager) => {
          await lockActiveObservationWrite(
            manager,
            options.observationIdToCopyTo,
          );
          const repository = manager.getRepository(Protocol);
          const protocol = await repository.findOneBy({
            id: options.protocolId,
          });
          if (!protocol) {
            throw new NotFoundException('Protocol not found');
          }

          // Remove any existing protocol for the target observation
          // (observation.create always creates an empty protocol placeholder)
          const existingProtocol = await repository.findOne({
            where: { observation: { id: options.observationIdToCopyTo } },
          });
          if (existingProtocol) {
            await repository.remove(existingProtocol);
          }

          const clonedProtocol = repository.create({
            ...protocol,
            id: undefined,
            observation: {
              id: options.observationIdToCopyTo,
            },
            user: {
              id: options.newUserId,
            },
          });
          return repository.save(clonedProtocol);
        }),
    );
  }
}
