import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { urlencoded, json } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getMode } from 'config/mode';
import { desktopTokenGuard, desktopDevCorsOrigin } from './desktop-http';

const isDesktop = getMode() === 'electron';
const isDesktopSubprocess = isDesktop && Boolean(process.env.PROD);
let application: NestExpressApplication | undefined;
let shuttingDown = false;

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  const deadline = setTimeout(() => {
    console.error('Backend shutdown timeout');
    process.exit(1);
  }, 5_000);
  deadline.unref();
  try {
    await application?.close();
    clearTimeout(deadline);
    process.exit(0);
  } catch (error) {
    console.error('Backend shutdown failed', error);
    process.exit(1);
  }
}

if (isDesktopSubprocess) {
  process.on('message', (message: unknown) => {
    if (
      message &&
      typeof message === 'object' &&
      (message as { type?: string }).type === 'shutdown'
    ) {
      void shutdown();
    }
  });
  process.on('disconnect', () => {
    void shutdown();
  });
}

async function bootstrap() {
  let port = process.env.BACKEND_DOCKER_APP_PORT_EXPOSED || 3000;

  // If the server is started in electron and prod mode, the port is passed as an argument
  // This is the used when the server is started by electon
  if (isDesktopSubprocess) {
    console.log('subprocess start', process.argv[3]);
    port = Number(process.argv[3]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('Invalid port');
    }

    console.log(`Server will start on port ${port}`);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
  });
  // Register CORS before authentication so file: renderers can preflight and
  // read error responses as well as successful responses.
  app.enableCors({
    origin: isDesktopSubprocess
      ? 'null'
      : isDesktop
      ? desktopDevCorsOrigin
      : process.env.FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  application = app;
  app.enableShutdownHooks();
  if (isDesktopSubprocess) {
    const token = process.env.ACTOGRAPH_DESKTOP_TOKEN;
    if (!token) throw new Error('Missing desktop session token');
    app.use(desktopTokenGuard(token));
  }
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
  const server = isDesktop
    ? await app.listen(port, '127.0.0.1')
    : await app.listen(port);
  console.info(`Server listening on port ${port}`);
  if (isDesktopSubprocess && process.connected) {
    process.send?.({ type: 'backend-ready', port: Number(port) });
  }
  server.setTimeout(1000 * 60 * 3); // 3 min // 600,000=> 10Min, 1200,000=>20Min, 1800,000=>30Min
}
void bootstrap().catch(async (error: unknown) => {
  console.error('Backend bootstrap failed', error);
  if (process.connected) {
    await new Promise<void>((resolve) => {
      process.send?.(
        {
          type: 'backend-startup-error',
          message: error instanceof Error ? error.message : String(error),
        },
        () => resolve(),
      );
    });
  }
  try {
    await application?.close();
  } catch (closeError) {
    console.error(closeError);
  }
  process.exit(1);
});
