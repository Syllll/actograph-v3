import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { AuthJwtModule } from '@auth-jwt/authJwt.module';
import { CronTasks } from './cron-tasks';
import { UsersModule } from '@users/users.module';
import { UserService } from '@users/services/user.service';
import { UserRoleEnum } from '@users/utils/user-role.enum';
import { application } from 'express';

@Module({
  imports: [AuthJwtModule, UsersModule],
  controllers: [],
  providers: [CronTasks],
  exports: [],
})
export class CronTasksModule {}
