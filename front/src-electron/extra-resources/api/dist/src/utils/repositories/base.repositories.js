"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = exports.TypeEnum = exports.OperatorEnum = void 0;
const typeorm_1 = require("typeorm");
var OperatorEnum;
(function (OperatorEnum) {
    OperatorEnum["LIKE"] = "LIKE";
    OperatorEnum["EQUAL"] = "=";
    OperatorEnum["SUPERIOR_OR_EQUAL"] = ">=";
    OperatorEnum["INFERIOR_OR_EQUAL"] = "<=";
    OperatorEnum["SUPERIOR"] = ">";
    OperatorEnum["INFERIOR"] = "<";
    OperatorEnum["CONTAINS"] = "CONTAINS";
    OperatorEnum["IN"] = "IN";
    OperatorEnum["EXISTS"] = "EXISTS";
    OperatorEnum["NOT_EXISTS"] = "NOT EXISTS";
    OperatorEnum["IS_NULL"] = "IS NULL";
})(OperatorEnum = exports.OperatorEnum || (exports.OperatorEnum = {}));
var TypeEnum;
(function (TypeEnum) {
    TypeEnum[TypeEnum["AND"] = 0] = "AND";
    TypeEnum[TypeEnum["OR"] = 1] = "OR";
})(TypeEnum = exports.TypeEnum || (exports.TypeEnum = {}));
class BaseRepository extends typeorm_1.Repository {
    allProperties() {
        return this.metadata.ownColumns.map((column) => column.propertyName);
    }
    allPropertiesForSelect() {
        const output = {};
        const props = this.allProperties();
        for (const p of props) {
            output[p] = true;
        }
        return output;
    }
    async findAndPaginate(options) {
        const results = await this.findAndFilter2(options);
        return results;
    }
    async findOneFromId(id, optionsArg) {
        let options = optionsArg;
        if (options) {
            if (!options.where)
                options.where = {};
            options.where.id = id;
        }
        else
            options = { where: { id } };
        const res = await this.findOne(options);
        return res === null ? undefined : res;
    }
    getCols() {
        return this.metadata.columns.map((col) => col.propertyName);
    }
    async findAndFilter2(options) {
        var _a;
        const results = await this.findAndFilter({
            conditions: (_a = options.conditions) !== null && _a !== void 0 ? _a : [],
        }, options.relations, options.limit, options.offset, options.orderBy, options.order, options.useAliases === undefined ? false : options.useAliases, options.select);
        return results;
    }
    async findAndFilter(whereObject, relations = [], limit = 50, offset = 0, orderBy = 'id', order = 'ASC', useAliases = false, select = undefined) {
        const tableName = this.metadata.tableName;
        const qb = this.createQueryBuilder(tableName);
        if (select)
            qb.select(select.map((s) => {
                return `${tableName + '.' + s}`;
            }));
        qb.take(limit);
        qb.skip(offset);
        const orderTargetField = this.replaceAllButLast(`${tableName}.${orderBy}`, '.', '_');
        qb.orderBy(orderTargetField, order);
        let aliasCount = 0;
        const toAlias = (name, reduceLength = 3) => {
            aliasCount = aliasCount + 1;
            const alias = `${name.slice(0, reduceLength)}_${aliasCount}`;
            return alias;
        };
        for (const relation of relations) {
            const reducedRelation = useAliases ? toAlias(relation) : relation;
            const relationSplitted = relation.split('.');
            if ((relationSplitted === null || relationSplitted === void 0 ? void 0 : relationSplitted.length) > 1) {
                const lastRel = relationSplitted[relationSplitted.length - 1];
                let propPathJoined = `${tableName}_`;
                for (let i = 0, ie = relationSplitted.length - 1; i < ie; i = i + 1) {
                    if (useAliases)
                        propPathJoined +=
                            i < ie - 1
                                ? `${toAlias(relationSplitted[i])}_`
                                : toAlias(relationSplitted[i]);
                    else
                        propPathJoined +=
                            i < ie - 1 ? `${relationSplitted[i]}_` : relationSplitted[i];
                }
                const joinPropAlias = `${propPathJoined}_${useAliases ? toAlias(lastRel) : lastRel}`;
                propPathJoined += `.${lastRel}`;
                qb.leftJoinAndSelect(propPathJoined, joinPropAlias);
            }
            else {
                qb.leftJoinAndSelect(`${tableName}.${relation}`, `${tableName}_${reducedRelation}`);
            }
        }
        this.processQuery(qb, tableName, whereObject.conditions);
        const groups = await qb.getManyAndCount();
        return {
            count: groups[1],
            results: groups[0],
        };
    }
    processQuery(qb, tableName, conditions, recursionIndex = 0) {
        var _a, _b, _c;
        for (let i = 0, ie = conditions.length; i < ie; i = i + 1) {
            const cond = conditions[i];
            if (cond.conditions && cond.conditions.length > 0) {
                if (i === 0) {
                    qb.where(new typeorm_1.Brackets((qb) => {
                        var _a;
                        this.processQuery(qb, tableName, (_a = cond.conditions) !== null && _a !== void 0 ? _a : [], ++recursionIndex);
                    }));
                }
                else if (cond.type === TypeEnum.AND) {
                    qb.andWhere(new typeorm_1.Brackets((qb) => {
                        var _a;
                        this.processQuery(qb, tableName, (_a = cond.conditions) !== null && _a !== void 0 ? _a : [], ++recursionIndex);
                    }));
                }
                else if (cond.type === TypeEnum.OR) {
                    qb.orWhere(new typeorm_1.Brackets((qb) => {
                        var _a;
                        this.processQuery(qb, tableName, (_a = cond.conditions) !== null && _a !== void 0 ? _a : [], ++recursionIndex);
                    }));
                }
            }
            else {
                let myCondName = `myCond_${recursionIndex}_${i}_${(_a = cond.key) === null || _a === void 0 ? void 0 : _a.replace(/\./g, '_')}`;
                let formattedTableNameAndCondKey = tableName + '.' + cond.key;
                const countDotInTableName = (formattedTableNameAndCondKey.match(/\./g) || []).length;
                if (countDotInTableName > 1) {
                    formattedTableNameAndCondKey = this.replaceAllButLast(formattedTableNameAndCondKey, '.', '_');
                }
                if (cond.castAsText) {
                    formattedTableNameAndCondKey = `CAST(${formattedTableNameAndCondKey} AS TEXT)`;
                }
                const accentInsensitive = (_b = cond.unaccent) !== null && _b !== void 0 ? _b : false;
                const caseInsensitive = (_c = (cond.caseless || cond.unaccent)) !== null && _c !== void 0 ? _c : false;
                let myCondValue = `:${myCondName}`;
                if (accentInsensitive) {
                    formattedTableNameAndCondKey =
                        'unaccent(LOWER(' + formattedTableNameAndCondKey + '))';
                    myCondValue = 'unaccent(LOWER(' + myCondValue + '))';
                }
                else if (caseInsensitive) {
                    formattedTableNameAndCondKey =
                        'LOWER(' + formattedTableNameAndCondKey + ')';
                    myCondValue = 'LOWER(' + myCondValue + ')';
                }
                let whereContent = `${formattedTableNameAndCondKey}           
          ${cond.operator}           
          ${myCondValue}
        `;
                let whereOptions = {};
                whereOptions[myCondName] = cond.value;
                if (cond.operator === OperatorEnum.CONTAINS && cond.key) {
                    console.log('type', typeof cond.value, cond.value);
                    if (typeof cond.value === 'string') {
                        formattedTableNameAndCondKey = `${formattedTableNameAndCondKey}::text[]`;
                    }
                    whereContent = `${formattedTableNameAndCondKey} @> ARRAY [:${myCondName}]`;
                    whereOptions[myCondName] = cond.value;
                }
                else if (cond.operator === OperatorEnum.IN && cond.key) {
                    if (!Array.isArray(cond.value)) {
                        throw new Error('Value should be an array for IN operator');
                    }
                    whereContent = `${formattedTableNameAndCondKey} IN (:...${myCondName})`;
                    whereOptions[myCondName] = cond.value;
                }
                else if (cond.operator === OperatorEnum.EXISTS ||
                    cond.operator === OperatorEnum.NOT_EXISTS ||
                    cond.operator === OperatorEnum.IS_NULL) {
                    whereContent = `${formattedTableNameAndCondKey} ${cond.operator}`;
                    whereOptions = undefined;
                }
                if (i === 0) {
                    qb.where(whereContent, whereOptions);
                }
                else if (cond.type === TypeEnum.AND) {
                    qb.andWhere(whereContent, whereOptions);
                }
                else if (cond.type === TypeEnum.OR) {
                    qb.orWhere(whereContent, whereOptions);
                }
            }
        }
    }
    replaceAllButLast(string, token, replaceWith) {
        let output = '';
        const parts = string.split(token);
        for (let i = 0, ie = parts.length - 1; i < ie; i = i + 1) {
            if (i > 0)
                output += replaceWith;
            output += parts[i];
        }
        output += token + parts[parts.length - 1];
        return output;
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base.repositories.js.map