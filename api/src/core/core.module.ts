import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { CronTasksModule } from './cron-tasks/cron-tasks.module';
import { TypeOrmExModule } from 'src/database/typeorm-ex.module';

@Module({
  imports: [
    TypeOrmExModule.forCustomRepository([]),
    UsersModule,
    CronTasksModule,
  ],
  controllers: [ ],
  providers: [],
})
export class CoreModule {}
