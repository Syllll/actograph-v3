import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@utils/repositories/base.repositories';
import { License } from '../entities/license.entity';
import { CustomRepository } from 'src/database/typeorm-ex.decorator';

@CustomRepository(License)
export class LicenseRepository extends BaseRepository<License> {}
