import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';

import { UserService } from '@users/services/user.service';

import { AppModule } from '../../app.module';
import { UserRoleEnum } from '@users/utils/user-role.enum';

async function createAdminUser(application: INestApplicationContext) {
  if (process.argv.length !== 5) {
    console.error('ERROR: wrong number of args');
    return;
  }

  const role = UserRoleEnum.Admin;
  const username = process.argv[3];
  const password = process.argv[4];

  const usersService = application.get(UserService);
  const users = await usersService.findWithUsername(<string>username);
  // console.log('Users found: ' + (<any>users).length);
  if (users && users.length === 0) {
    console.info('Creating the admin user...');
    await usersService.create({
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

async function main(application: INestApplicationContext) {
  try {
    if (process.argv[2] === 'create-admin-user') {
      await createAdminUser(application);
    } else {
      throw new Error('ERROR: Argument 2 not recognized');
    }
  } catch (err: any) {
    console.error(err);
  }
}

async function bootstrap() {
  const application = await NestFactory.createApplicationContext(AppModule);

  await main(application);

  await application.close();
  process.exit(0);
}

bootstrap();
