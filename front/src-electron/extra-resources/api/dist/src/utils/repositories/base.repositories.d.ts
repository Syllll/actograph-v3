import { Repository, FindOneOptions, ObjectLiteral } from 'typeorm';
export declare enum OperatorEnum {
    LIKE = "LIKE",
    EQUAL = "=",
    SUPERIOR_OR_EQUAL = ">=",
    INFERIOR_OR_EQUAL = "<=",
    SUPERIOR = ">",
    INFERIOR = "<",
    CONTAINS = "CONTAINS",
    IN = "IN",
    EXISTS = "EXISTS",
    NOT_EXISTS = "NOT EXISTS",
    IS_NULL = "IS NULL"
}
export declare enum TypeEnum {
    AND = 0,
    OR = 1
}
export interface IPaginationOutput<Entity> {
    count: number;
    results: Entity[];
}
export interface IConditions {
    key?: string;
    value?: string | number | boolean | Array<string | number>;
    type?: TypeEnum;
    operator?: OperatorEnum;
    conditions?: IConditions[];
    caseless?: boolean;
    unaccent?: boolean;
    castAsText?: boolean;
}
export interface IWhereObject {
    conditions: IConditions[];
}
export interface IPaginationOptions {
    select?: string[];
    limit?: number;
    offset?: number;
    relations?: string[];
    orderBy?: string;
    order?: 'ASC' | 'DESC';
    conditions?: IConditions[];
    useAliases?: boolean;
}
export declare class BaseRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
    allProperties(): string[];
    allPropertiesForSelect(): {
        [key: string]: boolean;
    };
    findAndPaginate(options: IPaginationOptions): Promise<IPaginationOutput<Entity>>;
    findOneFromId(id: number, optionsArg?: FindOneOptions<Entity>): Promise<Entity | undefined>;
    protected getCols<Entity>(): (keyof Entity)[];
    findAndFilter2(options: IPaginationOptions): Promise<IPaginationOutput<Entity>>;
    findAndFilter(whereObject: IWhereObject, relations?: string[], limit?: number, offset?: number, orderBy?: string, order?: 'ASC' | 'DESC' | undefined, useAliases?: boolean, select?: undefined | string[]): Promise<IPaginationOutput<Entity>>;
    private processQuery;
    private replaceAllButLast;
}
