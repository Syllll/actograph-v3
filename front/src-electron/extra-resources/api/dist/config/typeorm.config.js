"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmConfig = exports.dbPath = exports.envPath = void 0;
const dotenv_1 = require("dotenv");
exports.envPath = process.argv[2] === '--subprocess' ? process.argv[4] : undefined;
let _dbPath = process.argv[2] === '--subprocess' ? process.argv[5] : '';
if (_dbPath && !_dbPath.endsWith('/')) {
    _dbPath += '/';
}
exports.dbPath = _dbPath;
(0, dotenv_1.config)({
    path: exports.envPath
});
exports.typeOrmConfig = {
    type: process.env.DB_TYPE,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: `${_dbPath}${process.env.DB_NAME}`,
    entities: [__dirname + '/../src/**/*.entity.{js,ts}'],
    synchronize: false,
    migrations: [__dirname + '/../migrations/**/*.{js,ts}'],
    migrationsTableName: 'migrations_typeorm',
    migrationsRun: true,
    logging: false,
    ssl: process.env.DB_SSLCERT ? {
        ca: process.env.DB_SSLCERT,
    } : undefined,
    extra: {
        ssl: process.env.DB_SSLCERT ? {
            rejectUnauthorized: false
        } : undefined
    },
};
//# sourceMappingURL=typeorm.config.js.map