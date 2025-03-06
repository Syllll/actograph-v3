import { Module, OnModuleInit } from '@nestjs/common';
import { AuthJwtModule } from 'src/general/auth-jwt/authJwt.module';

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

    const username = process.env.ADMINUSER_LOGIN;
    const password = process.env.ADMINUSER_PASSWORD;
    if (username && password) {
      const role = UserRoleEnum.Admin;
      const users = await this.usersService.findWithUsername(<string>username);
      if (users && users.length === 0) {
        console.info('Creating the admin user...');
        await this.usersService.create({
          roles: [role],
          userJwt: {
            username,
            password,
            activated: true,
          },
        });
      } else {
        console.info('The admin user already exists. Skip creation step.');
      }
    }

    // ****************

    console.info(`Users module initialization done.`);
  }
}
