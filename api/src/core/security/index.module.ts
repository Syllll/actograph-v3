import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from '@users/users.module';
import { SecurityController } from './controllers/security.controller';
import { SecurityService } from './services/security/index.service';
import { TypeOrmExModule } from 'src/database/typeorm-ex.module';
import { LicenseRepository } from './repositories/license.repository';
import { LicenseService } from './services/license/license.service';
@Module({
  imports: [
    forwardRef(() => UsersModule),
    TypeOrmExModule.forCustomRepository([LicenseRepository]),
  ],
  controllers: [SecurityController],
  providers: [SecurityService, LicenseService],
  exports: [SecurityService, LicenseService],
})
export class SecurityModule {}
