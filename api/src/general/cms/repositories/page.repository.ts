import { BaseRepository } from '@utils/repositories/base.repositories';

import { Page } from '../entities/page.entity';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';

@CustomRepository(Page)
export class PageRepository extends BaseRepository<Page> {

}
