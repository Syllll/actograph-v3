---
description: Conventions backend NestJS + TypeORM pour l'API ActoGraph v3
globs: api/**
---

# Backend (API) - NestJS + TypeORM

**Reference Knowledge Base** : Voir `.knowledge-base/recipes/glutamat/creer-module-nestjs.md` pour la structure generale, mais **adapter pour TypeORM** (ce projet n'utilise pas MikroORM).

## Structure des fichiers

- **Entites** : `api/src/**/*.entity.ts` - Toutes les entites TypeORM doivent etre dans ce pattern
- **Migrations** : `api/migrations/` - Toutes les migrations TypeORM
- **Services** : `api/src/**/services/*.service.ts`
- **Controllers** : `api/src/**/controllers/*.controller.ts`
- **Repositories** : `api/src/**/repositories/*.repository.ts`
- **DTOs** : `api/src/**/dtos/*.dto.ts`
- **Modules** : `api/src/**/*.module.ts`

## Structure d'un module NestJS

Pour creer rapidement un nouveau module metier, suivre cette structure :

### Structure de dossiers

```
api/src/core/my-module/
├── my-module.module.ts          # Module principal
├── entities/
│   └── my-entity.entity.ts      # Entite TypeORM
├── repositories/
│   └── my-entity.repository.ts  # Repository personnalise
├── services/
│   └── my-entity.service.ts     # Service metier
├── controllers/
│   └── my-entity.controller.ts  # Controller REST
└── dtos/
    ├── my-entity-create.dto.ts  # DTO pour creation
    └── my-entity-update.dto.ts   # DTO pour mise a jour
```

### Template de module (`my-module.module.ts`)

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmExModule } from 'src/database/typeorm-ex.module';
import { MyEntityRepository } from './repositories/my-entity.repository';
import { MyEntityService } from './services/my-entity.service';
import { MyEntityController } from './controllers/my-entity.controller';
// Si besoin d'autres modules :
// import { UsersModule } from '@users/users.module';

@Module({
  imports: [
    // Si dependance circulaire, utiliser forwardRef :
    // forwardRef(() => UsersModule),
    TypeOrmExModule.forCustomRepository([MyEntityRepository]),
  ],
  controllers: [MyEntityController],
  providers: [MyEntityService],
  exports: [MyEntityService], // Exporter si utilise par d'autres modules
})
export class MyModule {}
```

### Template d'entite (`entities/my-entity.entity.ts`)

```typescript
import { Entity, Column, Index } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@utils/entities/base.entity';
import { GROUP_USER, GROUP_ADMIN } from '@users/serializationGroups/groups';

@Entity('my_entities')
export class MyEntity extends BaseEntity {
  @Expose({ groups: [GROUP_USER, GROUP_ADMIN] })
  @Column({ nullable: false })
  @Index()
  name!: string;

  @Expose({ groups: [GROUP_ADMIN] })
  @Column({ nullable: true })
  description?: string;
}
```

### Template de repository (`repositories/my-entity.repository.ts`)

```typescript
import { CustomRepository } from 'src/database/typeorm-ex.decorator';
import { BaseRepository } from '@utils/repositories/base.repositories';
import { MyEntity } from '../entities/my-entity.entity';

@CustomRepository(MyEntity)
export class MyEntityRepository extends BaseRepository<MyEntity> {
  // Methodes personnalisees si necessaire
}
```

### Template de service (`services/my-entity.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { MyEntityRepository } from '../repositories/my-entity.repository';
import { MyEntity } from '../entities/my-entity.entity';

@Injectable()
export class MyEntityService extends BaseService<MyEntity, MyEntityRepository> {
  constructor(
    @InjectRepository(MyEntityRepository)
    private readonly repository: MyEntityRepository,
  ) {
    super(repository);
  }

  // Methodes metier personnalisees
}
```

### Template de controller (`controllers/my-entity.controller.ts`)

```typescript
import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete } from '@nestjs/common';
import { BaseController } from '@utils/controllers/base.controller';
import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { Roles } from '@users/utils/roles.decorator';
import { UserRoleEnum } from '@users/utils/user-role.enum';
import { MyEntityService } from '../services/my-entity.service';
import { CreateMyEntityDto } from '../dtos/my-entity-create.dto';
import { UpdateMyEntityDto } from '../dtos/my-entity-update.dto';
import { PaginationQueries } from '@utils/dtos';
import { IPaginationOptions } from '@utils/repositories/base.repositories';

@Controller('my-entities')
export class MyEntityController extends BaseController {
  constructor(private readonly service: MyEntityService) {
    super();
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async findAll(@PaginationQueries() pagination: IPaginationOptions) {
    return await this.service.findAndPaginate(pagination);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: number) {
    const entity = await this.service.findOne(id);
    if (!entity) {
      throw new NotFoundException('Entity not found');
    }
    return entity;
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async create(@Body() dto: CreateMyEntityDto) {
    return await this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async update(@Param('id') id: number, @Body() dto: UpdateMyEntityDto) {
    return await this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async delete(@Param('id') id: number) {
    return await this.service.delete(id);
  }
}
```

### Template de DTO (`dtos/my-entity-create.dto.ts`)

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMyEntityDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

### Integration dans CoreModule

Apres creation du module, l'ajouter dans `api/src/core/core.module.ts` :

```typescript
import { MyModule } from './my-module/my-module.module';

@Module({
  imports: [
    // ... autres modules
    MyModule,
  ],
})
export class CoreModule {}
```

### Checklist de creation d'un module

1. Creer le dossier `api/src/core/my-module/`
2. Creer l'entite dans `entities/` (etendre `BaseEntity`)
3. Creer le repository dans `repositories/` (etendre `BaseRepository`, utiliser `@CustomRepository`)
4. Creer le service dans `services/` (etendre `BaseService`)
5. Creer le controller dans `controllers/` (etendre `BaseController`)
6. Creer les DTOs dans `dtos/` (avec validation `class-validator`)
7. Creer le module dans `my-module.module.ts`
8. Ajouter le module dans `CoreModule`
9. Generer la migration : `yarn migration:generate api/migrations/AddMyModule`
10. Executer la migration dans le conteneur Docker

## Conventions de code Backend

### Entites TypeORM

- Toutes les entites doivent etendre `BaseEntity` de `@utils/entities/base.entity`
- Utiliser les decorateurs TypeORM : `@Entity()`, `@Column()`, `@ManyToOne()`, `@OneToMany()`, `@OneToOne()`, `@JoinColumn()`
- Ajouter des index avec `@Index()` quand necessaire
- Les entites doivent etre dans des fichiers se terminant par `.entity.ts`
- `BaseEntity` fournit automatiquement : `id`, `createdAt`, `updatedAt`, `deletedAt` (soft delete)

Exemple :
```typescript
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '@utils/entities/base.entity';

@Entity('table_name')
export class MyEntity extends BaseEntity {
  @Column({ nullable: false })
  @Index()
  name!: string;

  @Column({ nullable: true })
  internalNote?: string;

  @ManyToOne(() => OtherEntity)
  @JoinColumn()
  otherEntity?: OtherEntity;
}
```

### Guards et Autorisation

- `JwtAuthGuard` : Verifie que l'utilisateur est authentifie (token JWT valide)
- `UserRolesGuard` : Verifie les roles de l'utilisateur (doit etre utilise avec `@Roles()`)
- `@Roles(UserRoleEnum.User, ...allMainUsers)` : Definit les roles autorises pour une route
- Les roles disponibles sont dans `@users/utils/user-role.enum`
- `allMainUsers` est un helper qui inclut tous les roles principaux
- Toujours utiliser `JwtAuthGuard` avant `UserRolesGuard` dans `@UseGuards()`

### Services NestJS

- Tous les services doivent etre decores avec `@Injectable()`
- Les services doivent etendre `BaseService<Entity, Repository>` quand approprie
- Injecter les repositories avec `@InjectRepository(RepositoryClass)`

Exemple :
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';

@Injectable()
export class MyService extends BaseService<MyEntity, MyRepository> {
  constructor(
    @InjectRepository(MyRepository)
    private readonly repository: MyRepository,
  ) {
    super(repository);
  }
}
```

### Controllers NestJS

- Tous les controllers doivent etendre `BaseController`
- Utiliser les decorateurs NestJS : `@Controller()`, `@Get()`, `@Post()`, `@Patch()`, `@Delete()`
- Utiliser `@UseGuards()` pour l'authentification/autorisation
- Utiliser `@Roles()` pour les permissions basees sur les roles
- Injecter les services dans le constructeur
- Pour la pagination, utiliser le decorateur `@PaginationQueries()` qui retourne un objet `IPaginationOptions`
- NestJS gere automatiquement les erreurs et les exceptions HTTP
- **IMPORTANT - Ordre d'enregistrement des controllers** : NestJS matche les routes dans l'ordre d'enregistrement des controllers dans le module. Les controllers avec des routes specifiques (ex: `@Controller('observations/readings')`) doivent etre enregistres AVANT les controllers avec des routes generiques (ex: `@Controller('observations')` avec `@Patch(':id')`). Sinon, une route generique peut intercepter une route specifique (ex: `/observations/readings` peut etre interpretee comme `/observations/:id` avec `id = "readings"`), causant des erreurs de validation (proprietes rejetees par le ValidationPipe). Toujours verifier l'ordre dans le tableau `controllers` du module.

Exemple :
```typescript
import { Controller, Get, UseGuards, Param, NotFoundException } from '@nestjs/common';
import { BaseController } from '@utils/controllers/base.controller';
import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { Roles } from '@users/utils/roles.decorator';
import { UserRoleEnum } from '@users/utils/user-role.enum';
import { PaginationQueries } from '@utils/dtos';
import { IPaginationOptions } from '@utils/repositories/base.repositories';

@Controller('my-resource')
export class MyController extends BaseController {
  constructor(private readonly service: MyService) {
    super();
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async findAll(@PaginationQueries() pagination: IPaginationOptions) {
    return await this.service.findAndPaginate(pagination);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: number) {
    const entity = await this.service.findOne(id);
    if (!entity) {
      throw new NotFoundException('Resource not found');
    }
    return entity;
  }
}
```

### Migrations TypeORM

- Les migrations doivent etre generees avec : `yarn migration:generate api/migrations/MigrationName`
- Executer les migrations avec : `yarn migration:run`
- Revenir en arriere avec : `yarn migration:revert`
- Creer une migration vide avec : `yarn migration:create api/migrations/MigrationName`
- **TOUJOURS executer les migrations dans le conteneur Docker API**

### Generation automatique des indexes (Entites et Migrations)

**Probleme resolu** : Quand l'API est bundlee avec esbuild, les glob patterns TypeORM ne fonctionnent pas. Les fichiers `all-entities.ts` et `all-migrations.ts` resolvent ce probleme en important explicitement toutes les entites et migrations.

**Comment ca fonctionne** :
- Le script `api/scripts/generate-indexes.js` scanne automatiquement :
  - Tous les fichiers `*.entity.ts` dans `api/src/` -> genere `api/src/database/all-entities.ts`
  - Tous les fichiers `*.ts` dans `api/migrations/` -> genere `api/src/database/all-migrations.ts`
- Ces fichiers sont **auto-generes** et ne doivent pas etre edites manuellement

**Quand est-ce execute** :
- **Automatiquement lors du build de production** (CI/CD) : Le script est appele en Step 1/4 dans `quasar.config.js` avant le build NestJS
- **Manuellement** : `yarn generate:indexes` (dans le dossier `api/`)
- **Avec le bundle** : `yarn build:bundle` (genere les indexes puis bundle avec esbuild)

**Consequence pratique** :
- Lors du developpement, il n'est **pas necessaire** de mettre a jour manuellement `all-migrations.ts` ou `all-entities.ts`
- Le script de build CI regenere ces fichiers automatiquement a partir des fichiers sources
- Les nouvelles migrations et entites sont automatiquement decouvertes et incluses dans le bundle

### Repositories

- Les repositories doivent etendre `BaseRepository<Entity>` ou utiliser le decorateur `@CustomRepository()`
- Utiliser `@InjectRepository()` dans les services pour injecter les repositories
- `BaseRepository` fournit les methodes suivantes :
  - `findAndPaginate(options: IPaginationOptions)` : Pagination avec filtres
  - `findOneFromId(id: number, options?: FindOneOptions)` : Trouver par ID (retourne undefined si non trouve)
  - `allProperties()` : Liste toutes les proprietes de l'entite
  - `allPropertiesForSelect()` : Objet avec toutes les proprietes pour select
- Les repositories gerent automatiquement les relations many-to-many lors du `save()`

### DTOs et Validation

- Tous les DTOs doivent utiliser les decorateurs de `class-validator` :
  - `@IsString()`, `@IsNumber()`, `@IsBoolean()`, `@IsOptional()`, `@IsNotEmpty()`
  - `@IsEnum(EnumClass)` pour les enums
  - `@IsDateString()` pour les dates
  - `@IsArray()`, `@ValidateNested()` pour les objets imbriques
  - `@Type(() => Class)` de `class-transformer` pour la transformation des objets imbriques
- Le `ValidationPipe` global est configure avec `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true`
- Tous les champs doivent avoir des decorateurs de validation, sinon ils seront supprimes

Exemple :
```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(MyEnum)
  @IsNotEmpty()
  type!: MyEnum;

  @ValidateNested()
  @Type(() => NestedDto)
  nested?: NestedDto;
}
```

### Pipes personnalises

- Utiliser les pipes disponibles dans `@utils/pipes` :
  - `ParseEnumPipe` : Valide et parse un enum
  - `ParseEnumArrayPipe` : Valide et parse un tableau d'enums
  - `ParseFilterPipe` : Parse les filtres de recherche
  - `ParseIncludePipe` : Valide les relations a inclure
  - `ParseIntOrUndefinedPipe` : Parse un entier ou retourne undefined
  - `ParseStringOrUndefinedPipe` : Parse une string ou retourne undefined
  - `ParseDatePipe` : Parse une date
- Utiliser ces pipes dans les query parameters avec `@Query('param', new ParseEnumPipe(MyEnum))`

## Gestion des dependances Backend

- Utiliser **yarn** (pas npm)
- Toujours executer `yarn install` dans le conteneur Docker API
- Le fichier `package.json` est dans `api/package.json`
