/**
 * Module général de l'application
 * 
 * Ce module regroupe les fonctionnalités générales de l'application,
 * notamment l'authentification JWT.
 * 
 * @module GeneralModule
 */
import { Module } from '@nestjs/common';
import { AuthJwtModule } from './auth-jwt/auth-jwt.module';

@Module({
  imports: [AuthJwtModule],
  controllers: [],
  providers: [],
})
export class GeneralModule {}
