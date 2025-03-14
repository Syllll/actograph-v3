import { Module, OnModuleInit } from '@nestjs/common';
import { AuthJwtModule } from 'src/general/auth-jwt/authJwt.module';
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

@Module({
  imports: [
    AuthJwtModule,
    TypeOrmExModule.forCustomRepository([UserRepository]),
  ],
  controllers: [UserController, AdminUserController],
  providers: [UserCreatedListener, UserService, JwtStrategy],
  exports: [UserService],
})
export class UsersModule implements OnModuleInit {
  constructor(private usersService: UserService) {}

  async onModuleInit() {
    console.info(`Users module initialization...`);

    // ****************
    // Admin user
    // ****************

    const adminUsername = process.env.ADMINUSER_LOGIN;
    const password = process.env.ADMINUSER_PASSWORD;
    if (adminUsername && password) {
      const role = UserRoleEnum.Admin;
      const users = await this.usersService.findWithUsername(<string>adminUsername);
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

    if (getMode() === 'electron') {

      // Get the user name at the os level
      const user = os.userInfo();
      const localUsername = user.username;

      // Create the local user if it doesn't exist
      const users = await this.usersService.findWithUsername(<string>localUsername);
      if (users && users.length === 0) {
        console.info('Creating the local user...');
        await this.usersService.create({
          roles: [UserRoleEnum.User],
          userJwt: {
            username: localUsername,
            password: localUsername,
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
