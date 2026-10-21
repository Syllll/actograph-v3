import {
  BaseRepository,
  IPaginationOptions,
  IPaginationOutput,
} from '../../../utils/repositories/base.repositories';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';
import { Reading } from '../entities/reading.entity';

@CustomRepository(Reading)
export class ReadingRepository extends BaseRepository<Reading> {
  // Les horodatages peuvent être identiques. Stabiliser aussi les frontières
  // de pages pour que l'ordre de saisie reste le même après rechargement.
  public override findAndPaginate(
    options: IPaginationOptions,
  ): Promise<IPaginationOutput<Reading>> {
    return super.findAndPaginate({
      ...options,
      additionalOrderBy:
        options.orderBy === 'dateTime'
          ? ['sortOrder', 'id']
          : options.additionalOrderBy,
    });
  }
}
