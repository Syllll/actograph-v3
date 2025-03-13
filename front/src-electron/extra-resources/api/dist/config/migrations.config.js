"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const typeorm_config_1 = require("./typeorm.config");
const dataSource = new typeorm_1.DataSource(Object.assign({}, typeorm_config_1.typeOrmConfig));
exports.default = dataSource;
//# sourceMappingURL=migrations.config.js.map