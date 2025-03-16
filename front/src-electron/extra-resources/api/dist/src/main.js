'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const core_1 = require('@nestjs/core');
const common_1 = require('@nestjs/common');
const app_module_1 = require('./app.module');
const express_1 = require('express');
const mode_1 = require('../config/mode');
async function bootstrap() {
  let port = process.env.BACKEND_DOCKER_APP_PORT_EXPOSED || 3000;
  if ((0, mode_1.getMode)() === 'electron' && process.env.PROD) {
    console.log('subprocess start', process.argv[3]);
    port = parseInt(process.argv[3]);
    if (isNaN(port)) {
      throw new Error('Invalid port');
    }
    console.log(`Server will start on port ${port}`);
  }
  const app = await core_1.NestFactory.create(app_module_1.AppModule, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
  });
  app.use((0, express_1.json)({ limit: '300mb' }));
  app.use((0, express_1.urlencoded)({ extended: true, limit: '150mb' }));
  app.useGlobalPipes(
    new common_1.ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      enableDebugMessages: true,
    })
  );
  const server = await app.listen(port);
  server.setTimeout(1000 * 60 * 5);
}
bootstrap();
//# sourceMappingURL=main.js.map
