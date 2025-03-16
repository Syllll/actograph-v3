'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const core_1 = require('@nestjs/core');
const user_service_1 = require('../users/services/user.service');
const app_module_1 = require('../../app.module');
const user_role_enum_1 = require('../users/utils/user-role.enum');
async function createAdminUser(application) {
  if (process.argv.length !== 5) {
    console.error('ERROR: wrong number of args');
    return;
  }
  const role = user_role_enum_1.UserRoleEnum.Admin;
  const username = process.argv[3];
  const password = process.argv[4];
  const usersService = application.get(user_service_1.UserService);
  const users = await usersService.findWithUsername(username);
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
async function main(application) {
  try {
    if (process.argv[2] === 'create-admin-user') {
      await createAdminUser(application);
    } else {
      throw new Error('ERROR: Argument 2 not recognized');
    }
  } catch (err) {
    console.error(err);
  }
}
async function bootstrap() {
  const application = await core_1.NestFactory.createApplicationContext(
    app_module_1.AppModule
  );
  await main(application);
  await application.close();
  process.exit(0);
}
bootstrap();
//# sourceMappingURL=console.js.map
