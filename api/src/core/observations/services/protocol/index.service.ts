import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { Protocol } from '../../entities/protocol.entity';
import { ProtocolRepository } from '../../repositories/protocol.repository';
import { Find } from './find';
import { Check } from './check';
import { Items } from './items';
import { NotFoundException } from '@nestjs/common';

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
    const protocol = await this.findOne(options.protocolId);
    if (!protocol) {
      throw new NotFoundException('Protocol not found');
    }

    const clonedProtocol = this.protocolRepository.create({
      ...protocol,
      id: undefined,
      observation: {
        id: options.observationIdToCopyTo,
      },
      user: {
        id: options.newUserId,
      },
    });
    return this.protocolRepository.save(clonedProtocol);
  }
}
