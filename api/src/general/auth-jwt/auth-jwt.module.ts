/**
 * Module d'authentification JWT
 * 
 * Ce module gère l'authentification basée sur les JSON Web Tokens (JWT).
 * Il fournit les fonctionnalités de connexion, déconnexion, inscription,
 * et gestion des tokens JWT.
 * 
 * @module AuthJwtModule
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthJwtController } from './controllers/auth-jwt.controller';
import { UserJwtService } from './services/user-jwt.service';
import { UserJwtRepository } from './repositories/user.repository';
import { TypeOrmExModule } from 'src/database/typeorm-ex.module';

@Module({
  imports: [
    // Enregistrement du repository personnalisé pour UserJwt
    TypeOrmExModule.forCustomRepository([UserJwtRepository]),
    // Module Passport pour l'authentification
    PassportModule,
    // Configuration du module JWT avec le secret depuis les variables d'environnement
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      // signOptions: { expiresIn: 3600 }, // secs - Optionnel : expiration des tokens
    }),
  ],
  controllers: [AuthJwtController],
  providers: [UserJwtService],
  // Export du service pour utilisation dans d'autres modules
  exports: [UserJwtService],
})
export class AuthJwtModule {} 