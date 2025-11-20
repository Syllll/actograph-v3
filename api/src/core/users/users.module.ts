import { Inject, Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { AuthJwtModule } from 'src/general/auth-jwt/auth-jwt.module';
import * as os from 'os';
import { getMode } from 'config/mode';
import { UserController } from './controllers/user.controller';
import { AdminUserController } from './controllers/admin/admin-user.controller';
import { UserCreatedListener } from './listeners/userCreated.listener';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmExModule } from 'src/database/typeorm-ex.module';
import { UserRoleEnum } from './utils/user-role.enum';
import { JwtStrategy } from './jwt.strategy';
import { SecurityModule } from '../security/index.module';
import { SecurityService } from '@core/security/services/security/index.service';

/**
 * Module principal pour la gestion des utilisateurs.
 * Ce module fournit :
 * - Les controllers pour les endpoints utilisateurs (publics et admin)
 * - Les services pour la gestion des utilisateurs
 * - Les guards et stratégies d'authentification JWT
 * - Les listeners pour les événements liés aux utilisateurs
 *
 * À l'initialisation, crée automatiquement :
 * - L'utilisateur administrateur (si configuré via variables d'environnement)
 * - L'utilisateur local (si l'application est en mode Electron)
 */
@Module({
  imports: [
    AuthJwtModule,
    forwardRef(() => SecurityModule),
    TypeOrmExModule.forCustomRepository([UserRepository]),
  ],
  controllers: [UserController, AdminUserController],
  providers: [UserCreatedListener, UserService, JwtStrategy],
  exports: [UserService],
})
export class UsersModule implements OnModuleInit {
  constructor(
    @Inject(forwardRef(() => SecurityService))
    private securityService: SecurityService,
    private usersService: UserService,
  ) {}

  /**
   * Initialise le module lors du démarrage de l'application.
   * Crée automatiquement les utilisateurs système nécessaires :
   * - L'utilisateur administrateur (si configuré)
   * - L'utilisateur local (si en mode Electron)
   */
  async onModuleInit() {
    console.info(`Users module initialization...`);

    // ****************
    // Admin user
    // ****************

    // Crée l'utilisateur administrateur si les variables d'environnement sont définies
    const adminUsername = process.env.ADMINUSER_LOGIN;
    const password = process.env.ADMINUSER_PASSWORD;
    if (adminUsername && password) {
      const role = UserRoleEnum.Admin;
      const users = await this.usersService.findWithUsername(
        <string>adminUsername,
      );
      if (users && users.length === 0) {
        console.info('Creating the admin user...');
        await this.usersService.create({
          roles: [role],
          userJwt: {
            username: adminUsername,
            password,
            activated: true,
          },
        });
      } else {
        console.info('The admin user already exists. Skip creation step.');
      }
    }

    // ****************
    // Local user
    // ****************
    // Only if the app is running in electron mode, as a desktop app.
    // The local user is used to identify the user on the machine.
    // It is not used for authentication, for which we use the JWT token.

    // Crée l'utilisateur local uniquement en mode Electron
    if (getMode() === 'electron') {
      // Get the user name at the os level
      const localUsername = this.securityService.electron.getLocalUsername();

      // Create the local user if it doesn't exist
      // The password is the username of the user at the os level
      const users = await this.usersService.findWithUsername(
        <string>localUsername,
      );
      if (users && users.length === 0) {
        console.info('Creating the local user...');
        await this.usersService.create({
          roles: [UserRoleEnum.User],
          userJwt: {
            username: localUsername,
            password: localUsername.split('-')[1],
            activated: true,
          },
        });
      } else {
        console.info('The local user already exists. Skip creation step.');
      }
    }

    // ****************

    console.info(`Users module initialization done.`);
  }
}
