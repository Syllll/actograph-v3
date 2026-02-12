import {
  Repository,
  Brackets,
  SelectQueryBuilder,
  WhereExpression,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  DeepPartial,
  SaveOptions,
} from 'typeorm';

import { BaseEntity } from './../entities/base.entity';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';

export enum OperatorEnum {
  LIKE = 'LIKE',
  EQUAL = '=',
  SUPERIOR_OR_EQUAL = '>=',
  INFERIOR_OR_EQUAL = '<=',
  SUPERIOR = '>',
  INFERIOR = '<',
  CONTAINS = 'CONTAINS',
  IN = 'IN',
  EXISTS = 'EXISTS',
  NOT_EXISTS = 'NOT EXISTS',
  IS_NULL = 'IS NULL',
}

export enum TypeEnum {
  AND,
  OR,
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

export class BaseRepository<
  Entity extends ObjectLiteral,
> extends Repository<Entity> {
  public allProperties(): string[] {
    return this.metadata.ownColumns.map((column) => column.propertyName);
  }

  public allPropertiesForSelect(): {
    [key: string]: boolean;
  } {
    const output = {} as { [key: string]: boolean };
    const props = this.allProperties();
    for (const p of props) {
      output[p] = true;
    }
    return output;
  }

  public async findAndPaginate(
    options: IPaginationOptions,
  ): Promise<IPaginationOutput<Entity>> {
    const results = await this.findAndFilter2(options);

    return results;
  }

  async findOneFromId(
    id: number,
    optionsArg?: FindOneOptions<Entity>,
  ): Promise<Entity | undefined> {
    let options = optionsArg as any;
    if (options) {
      if (!options.where) options.where = {} as any;
      options.where.id = id;
    } else options = { where: { id } };
    const res = await this.findOne(<FindOneOptions<Entity>>options);
    return res === null ? undefined : res;
  }

  protected getCols<Entity>(): (keyof Entity)[] {
    return this.metadata.columns.map(
      (col) => col.propertyName,
    ) as (keyof Entity)[];
  }

  async findAndFilter2(
    options: IPaginationOptions,
  ): Promise<IPaginationOutput<Entity>> {
    const results = await this.findAndFilter(
      {
        conditions: options.conditions ?? [],
      },
      options.relations,
      options.limit,
      options.offset,
      options.orderBy,
      options.order,
      options.useAliases === undefined ? false : options.useAliases,
      options.select,
    );

    return results;
  }

  async findAndFilter(
    whereObject: IWhereObject,
    relations: string[] = [],
    limit = 50,
    offset = 0,
    orderBy = 'id',
    order: 'ASC' | 'DESC' | undefined = 'ASC',
    useAliases = false,
    select: undefined | string[] = undefined,
  ): Promise<IPaginationOutput<Entity>> {
    const tableName = this.metadata.tableName;

    const qb = this.createQueryBuilder(tableName);
    if (select)
      qb.select(
        select.map((s: string) => {
          return `${tableName + '.' + s}`;
        }),
      );
    qb.take(limit);
    qb.skip(offset);

    const orderTargetField = this.replaceAllButLast(
      `${tableName}.${orderBy}`,
      '.',
      '_',
    );
    qb.orderBy(orderTargetField, order);

    // If a relation is too long, we may use an alias to avoid any conflict/bug.
    let aliasCount = 0;
    const toAlias = (name: string, reduceLength = 3): string => {
      aliasCount = aliasCount + 1;
      const alias = `${name.slice(0, reduceLength)}_${aliasCount}`;
      return alias;
    };

    // Loop on all relations to add them to the query
    for (const relation of relations) {
      const reducedRelation = useAliases ? toAlias(relation) : relation;
      const relationSplitted = relation.split('.');

      if (relationSplitted?.length > 1) {
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

        const joinPropAlias = `${propPathJoined}_${
          useAliases ? toAlias(lastRel) : lastRel
        }`;
        propPathJoined += `.${lastRel}`;

        qb.leftJoinAndSelect(propPathJoined, joinPropAlias);
        // console.log(propPathJoined, joinPropAlias);
      } else {
        qb.leftJoinAndSelect(
          `${tableName}.${relation}`,
          `${tableName}_${reducedRelation}`,
        );
      }
    }

    // Start the recursion
    this.processQuery(qb, tableName, whereObject.conditions);

    //console.log('--------query: ', qb.getQuery())

    const groups = await qb.getManyAndCount();

    return {
      count: groups[1],
      results: groups[0],
    };
  }

  private processQuery(
    qb: SelectQueryBuilder<Entity> | WhereExpression,
    tableName: string,
    conditions: IConditions[],
    recursionIndex = 0,
  ) {
    // Loop on all conditions to build the where request
    // This is a recursive function that will call processQuery (itself) if a condition has sub conditions
    for (let i = 0, ie = conditions.length; i < ie; i = i + 1) {
      const cond = conditions[i];

      // If the condition has sub conditions, we will call the function recursively
      if (cond.conditions && cond.conditions.length > 0) {
        if (i === 0) {
          qb.where(
            new Brackets((qb) => {
              this.processQuery(
                qb,
                tableName,
                cond.conditions ?? [],
                ++recursionIndex,
              );
            }),
          );
        } else if (cond.type === TypeEnum.AND) {
          qb.andWhere(
            new Brackets((qb) => {
              this.processQuery(
                qb,
                tableName,
                cond.conditions ?? [],
                ++recursionIndex,
              );
            }),
          );
        } else if (cond.type === TypeEnum.OR) {
          qb.orWhere(
            new Brackets((qb) => {
              this.processQuery(
                qb,
                tableName,
                cond.conditions ?? [],
                ++recursionIndex,
              );
            }),
          );
        }
      }
      // If the condition is a standard condition, we will add it to the where request
      else {
        // Construct a condition name that is unique to avoir any name conflict
        let myCondName = `myCond_${recursionIndex}_${i}_${cond.key?.replace(
          /\./g,
          '_',
        )}`;

        // Construct the string content of the where (andWhere, orWhere) request.
        // Something like list.owner.id must be tranformed into list_owner.id. That way, it will use the alias previously defined by
        // the recursive nature of the function.
        let formattedTableNameAndCondKey = tableName + '.' + cond.key;
        const countDotInTableName = (
          formattedTableNameAndCondKey.match(/\./g) || []
        ).length;
        if (countDotInTableName > 1) {
          formattedTableNameAndCondKey = this.replaceAllButLast(
            formattedTableNameAndCondKey,
            '.',
            '_',
          );
        }

        // Convert the value to text
        // This is required to use the LIKE operator on fields that are not text (enum for example)
        if (cond.castAsText) {
          formattedTableNameAndCondKey = `CAST(${formattedTableNameAndCondKey} AS TEXT)`;
        }

        // Deal with the caseless and unaccent options
        //
        // Standard case
        // LOWER(myColumn) = LOWER(:myParam)
        // options: { myParam: 'myValue' }
        const accentInsensitive = cond.unaccent ?? false;
        const caseInsensitive = (cond.caseless || cond.unaccent) ?? false;

        let myCondValue = `:${myCondName}`;
        if (accentInsensitive) {
          formattedTableNameAndCondKey =
            'unaccent(LOWER(' + formattedTableNameAndCondKey + '))';
          myCondValue = 'unaccent(LOWER(' + myCondValue + '))';
        } else if (caseInsensitive) {
          formattedTableNameAndCondKey =
            'LOWER(' + formattedTableNameAndCondKey + ')';
          myCondValue = 'LOWER(' + myCondValue + ')';
        }

        let whereContent = `${formattedTableNameAndCondKey}           
          ${cond.operator}           
          ${myCondValue}
        `;

        // Create the whereOptions object that will be used to insert the value used by condition
        let whereOptions: any = {};
        whereOptions[myCondName] = cond.value;

        // Special cases for: CONTAINS, IN, EXISTS, NOT EXISTS, IS NULL
        // We will override the standard case values
        if (cond.operator === OperatorEnum.CONTAINS && cond.key) {
          // If the value is a string, we will cast the db array to text[] to avoid type issues
          // If it is not, we do nothing and assume the user knows what he is doing
          if (typeof cond.value === 'string') {
            formattedTableNameAndCondKey = `${formattedTableNameAndCondKey}::text[]`;
          }

          //whereContent = `${formattedTableNameAndCondKey} @> '{":${myCondName}"}'`;
          whereContent = `${formattedTableNameAndCondKey} @> ARRAY [:${myCondName}]`;
          whereOptions[myCondName] = cond.value;
        } else if (cond.operator === OperatorEnum.IN && cond.key) {
          if (!Array.isArray(cond.value)) {
            throw new Error('Value should be an array for IN operator');
          }

          whereContent = `${formattedTableNameAndCondKey} IN (:...${myCondName})`;
          whereOptions[myCondName] = cond.value;
        } else if (
          cond.operator === OperatorEnum.EXISTS ||
          cond.operator === OperatorEnum.NOT_EXISTS ||
          cond.operator === OperatorEnum.IS_NULL
        ) {
          whereContent = `${formattedTableNameAndCondKey} ${cond.operator}`;
          whereOptions = undefined;
        }

        //console.log({whereContent, whereOptions})

        // Use type orm to add the condition with its content
        if (i === 0) {
          qb.where(whereContent, whereOptions);
        } else if (cond.type === TypeEnum.AND) {
          qb.andWhere(whereContent, whereOptions);
        } else if (cond.type === TypeEnum.OR) {
          qb.orWhere(whereContent, whereOptions);
        }
      }
    }
  }

  private replaceAllButLast(
    string: string,
    token: string,
    replaceWith: string,
  ) {
    let output = '';

    const parts = string.split(token);

    // Loop on each part to replace the character
    for (let i = 0, ie = parts.length - 1; i < ie; i = i + 1) {
      if (i > 0) output += replaceWith;
      output += parts[i];
    }

    output += token + parts[parts.length - 1];

    return output;
  }

  override async save<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & { reload: false; }): Promise<T[]>;
  override async save<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;
  override async save<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & { reload: false; }): Promise<T>;
  override async save<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;
  override async save<T extends DeepPartial<Entity>>(entityOrEntities: T | T[], options?: SaveOptions): Promise<T | T & Entity | T[] | (T & Entity)[]> {
    // Get the many to many relations
    const manyToManyRelationsPropertyNames = this.metadata.relations.filter(relation => relation.isManyToMany).map(relation => relation.propertyName);
    
    const dealWithManyToManyRelations = async (entity: Entity) => {
      // does entity define one or more many to many relations?
      const hasManyToManyRelations = manyToManyRelationsPropertyNames.some(relation => entity[relation]);
      if (!hasManyToManyRelations) {
        return entity;
      }

      // List all the many to many relations that are not null
      const manyToManyRelations = manyToManyRelationsPropertyNames.filter(relation => entity[relation]);

      await this.saveAndSyncManyToManyRelations({
        entity: entity,
        relations: manyToManyRelations,
      });

      for (const relation of manyToManyRelations) {
        delete entity[relation];
      }

      return entity;
    }

    if (Array.isArray(entityOrEntities)) {
      const entities = await Promise.all(
        (entityOrEntities as any[]).map(dealWithManyToManyRelations)
      );
      return super.save(entities as any, options);
    } else {
      const entity = await dealWithManyToManyRelations(entityOrEntities as any);
      return super.save(entity as any, options);
    }
  }

  private async saveAndSyncManyToManyRelations(options: {
    entity: Entity;
    relations: string[];
  }) {
    const entity = options.entity;
    const relations = options.relations;

    // Get the entity with the relations
    const entityWithRelations = await this.findOneFromId(entity.id, {
      relations: relations,
    });
    if (!entityWithRelations) {
      throw new NotFoundException('Entity not found');
    }

    for (const relation of relations) {
      // For this relation, find what we need to add and/or remove
      const relationEntity = entityWithRelations[relation];
      const relationEntityIds = relationEntity.map((relation: any) => relation.id);

      // Find the ids that are in the entity.relations but not in the relationEntityIds
      const idsToAdd = entity[relation].filter((id: any) => !relationEntityIds.includes(id));
      
      // Find the ids that are in the relationEntityIds but not in the entity.relations
      const idsToRemove = relationEntityIds.filter((id: any) => !entity[relation].includes(id));

      // Using the query builder, add the ids to the relation
      const qb = this.createQueryBuilder(this.metadata.tableName);
      qb.relation(relation).of(entity.id).add(idsToAdd);

      // Using the query builder, remove the ids from the relation
      qb.relation(relation).of(entity.id).remove(idsToRemove);
 
      // Save the entity
      await qb.execute();
    }

    // Save the entity
    //const savedEntity = await this.save(entityWithRelations);

    //return savedEntity;
  }
}
