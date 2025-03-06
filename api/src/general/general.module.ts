import { Module } from '@nestjs/common';
import { AuthJwtModule } from './auth-jwt/authJwt.module';
import { CMSModule } from './cms/index.module';

@Module({
  imports: [AuthJwtModule, CMSModule],
  controllers: [],
  providers: [],
})
export class GeneralModule {}
