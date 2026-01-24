import * as path from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from 'dotenv';
import { getMode } from './mode';

// Import explicit entities and migrations for bundling compatibility
// When bundled with esbuild, glob patterns don't work, so we use explicit imports
import { AllEntities } from '../src/database/all-entities';
import { AllMigrations } from '../src/database/all-migrations';

// When nestjs is running as electron and PROD, the env path is passed as the 4th argument
// This is the case when the software is run as a desktop app
const _envPath = getMode() === 'electron' && process.env.PROD ? process.argv[4] : undefined
export const envPath = _envPath;

// When nestjs is called with --subprocess, the db path is passed as the 5th argument
// This is the case when the software is run as a desktop app
let _dbPath = getMode() === 'electron' && process.env.PROD ? process.argv[5] : ''
// Use path.sep for cross-platform compatibility (/ on Unix, \ on Windows)
if (_dbPath && !_dbPath.endsWith(path.sep) && !_dbPath.endsWith('/')) {
  _dbPath += path.sep;
}
export const dbPath = _dbPath;

config({
  path: envPath
});

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: process.env.DB_TYPE as any,
  host: process.env.DB_HOST,
  port: parseInt(<string>process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: `${_dbPath ?? ''}${process.env.DB_NAME}`,
  // Use explicit entity imports for bundling compatibility (esbuild)
  // This works both in development and production (bundled) mode
  entities: AllEntities,
  synchronize: false,
  // Use explicit migration imports for bundling compatibility (esbuild)
  migrations: AllMigrations,
  migrationsTableName: 'migrations_typeorm',
  migrationsRun: true,
  logging: false,
  // logging: true,
  ssl: process.env.DB_SSLCERT ? {
    ca: process.env.DB_SSLCERT,
  } : undefined,
  extra: {
    ssl: process.env.DB_SSLCERT ? {
        // Disregard mismatch between localhost and rds.amazonaws.com
        rejectUnauthorized: false 
    } : undefined
  },
};
