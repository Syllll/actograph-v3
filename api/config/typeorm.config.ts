import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// When nestjs is called with --subprocess, the env path is passed as the 4th argument
// This is the case when the software is run as a desktop app
export const envPath = process.argv[2] === '--subprocess' ? process.argv[4] : undefined

// When nestjs is called with --subprocess, the db path is passed as the 5th argument
// This is the case when the software is run as a desktop app
let _dbPath = process.argv[2] === '--subprocess' ? process.argv[5] : ''
if (_dbPath && !_dbPath.endsWith('/')) {
  _dbPath += '/'
}
export const dbPath = _dbPath;

config({
  path: envPath
});
// TypeOrmModuleOptions = interface des options de typeorm

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: process.env.DB_TYPE as any,
  host: process.env.DB_HOST,
  port: parseInt(<string>process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: `${_dbPath}${process.env.DB_NAME}`,
  // Tous les fichiers dans le dossier source qui finissent par entity.ts ou js seront pris en compte
  entities: [__dirname + '/../src/**/*.entity.{js,ts}'],
  synchronize: false,
  migrations: [__dirname + '/../migrations/**/*.{js,ts}'],
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
