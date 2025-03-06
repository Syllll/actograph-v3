import { Module } from '@nestjs/common';
import { AuthJwtModule } from './auth-jwt/authJwt.module';

@Module({
  imports: [AuthJwtModule],
  controllers: [],
  providers: [],
})
export class GeneralModule {}
