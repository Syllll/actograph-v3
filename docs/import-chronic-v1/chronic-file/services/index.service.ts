import { ImportExport } from './import-export';

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Access } from './access';
import { Merge } from './merge';
import { ObservationService } from 'src/core/observations/services/observation/index.service';
import { ProtocolService } from 'src/core/observations/services/protocol/index.service';
import { ProtocolItemService } from 'src/core/observations/services/protocol-item/index.service';
import { ReadingService } from 'src/core/observations/services/reading/index.service';

@Injectable()
export class ChronicFileService {
  public importExport: ImportExport = new ImportExport({
    chronicFileService: this,
    observationsService: this.observationsService,
    protocolService: this.protocolService,
    protocolItemService: this.protocolItemService,
    readingService: this.readingService,
  });
  public access = new Access();
  public merge = new Merge();

  constructor(
    private readonly observationsService: ObservationService,
    private readonly protocolService: ProtocolService,
    private readonly protocolItemService: ProtocolItemService,
    private readonly readingService: ReadingService,
  ) {}
}
