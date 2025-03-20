import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { Protocol } from '../../entities/protocol.entity';
import { ProtocolRepository } from '../../repositories/protocol.repository';
import { Find } from './find';
import { Check } from './check';
import { Items } from './items';

@Injectable()
  export class ProtocolService extends BaseService<
  Protocol,
  ProtocolRepository
> {
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
}