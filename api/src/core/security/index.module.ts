import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from '@users/users.module';
import { SecurityController } from './controllers/security.controller';
import { SecurityService } from './services/security.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
  ],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
