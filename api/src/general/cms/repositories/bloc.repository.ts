import { BaseRepository } from '@utils/repositories/base.repositories';

import { Bloc } from '../entities/bloc.entity';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';

@CustomRepository(Bloc)
export class BlocRepository extends BaseRepository<Bloc> {

}
