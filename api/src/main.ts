import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { urlencoded, json } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  let port = 3000;
  
  // If the server is started as a subprocess, the port is passed as an argument
  // This is the used when the server is started by electon
  // console.log('args', process.argv);
  if (process.argv[2] === '--subprocess') {
    console.log('subprocess start', process.argv[3]);
    port = parseInt(process.argv[3]);
    if (isNaN(port)) {
      throw new Error('Invalid port');
    }

    console.log(`Server will start on port ${port}`);
  }

  

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
  });
  app.use(json({ limit: '300mb' }));
  app.use(urlencoded({ extended: true, limit: '150mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      // automatically transform payloads (coming from the network)
      // to be objects typed according to their DTO classes
      // (= enforce type checking and type casting according to DTO validations)
      transform: true,
      // this will automatically remove non-whitelisted properties
      // (= remove propreties without any decorator in the validation class).
      whitelist: true,
      // when non-whitelisted properties are present,
      // stop the request from processing,
      // return an error response to the user
      // (used alongside `whilelist: true`)
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      // TODO: to verify
      enableDebugMessages: true,
      // groups: []
      // disableErrorMessages: true,
      // validationError: {
      //   target: false,
      //   value: false,
      // },
    }),
  );
  const server = await app.listen(port);
  server.setTimeout(1000 * 60 * 5); // 5 min // 600,000=> 10Min, 1200,000=>20Min, 1800,000=>30Min
}
bootstrap();
