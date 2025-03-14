import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { CronTasksModule } from './cron-tasks/cron-tasks.module';
import { TypeOrmExModule } from 'src/database/typeorm-ex.module';
import { SecurityModule } from './security/index.module';

@Module({
  imports: [
    TypeOrmExModule.forCustomRepository([]),
    UsersModule,
    SecurityModule,
    CronTasksModule,
  ],
  controllers: [ ],
  providers: [],
})
export class CoreModule {}
