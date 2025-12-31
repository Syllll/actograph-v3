// ormconfig-migrations.ts
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { typeOrmConfig } from './typeorm.config';

// import { config } from 'dotenv';
// config();

// export = typeOrmConfig;

const dataSource = new DataSource({
  ...(typeOrmConfig as any)
}
)

export default dataSource
