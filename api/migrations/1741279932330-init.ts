import { MigrationInterface, QueryRunner } from "typeorm";

export class init1741279932330 implements MigrationInterface {
    name = 'init1741279932330'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user-jwt" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "username" varchar(255) NOT NULL, "password" varchar(255) NOT NULL, "activated" boolean NOT NULL DEFAULT (0), "activationToken" varchar(255), "forgetPasswordToken" varchar(255))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_da3d4c8b2930a74df43eec09be" ON "user-jwt" ("username") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"))`);
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"))`);
        await queryRunner.query(`INSERT INTO "users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "IDX_da3d4c8b2930a74df43eec09be"`);
        await queryRunner.query(`DROP TABLE "user-jwt"`);
    }

}
