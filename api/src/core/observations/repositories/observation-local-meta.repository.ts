import { BaseRepository } from '../../../utils/repositories/base.repositories';
import { CustomRepository } from 'src/database/typeorm-ex.decorator';
import { ObservationLocalMeta } from '../entities/observation-local-meta.entity';

@CustomRepository(ObservationLocalMeta)
export class ObservationLocalMetaRepository extends BaseRepository<ObservationLocalMeta> {}
