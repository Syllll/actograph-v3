import { MigrationInterface, QueryRunner } from "typeorm";

export class addProtocolItems1742460309452 implements MigrationInterface {
    name = 'addProtocolItems1742460309452'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
        await queryRunner.query(`CREATE TABLE "temporary_protocols" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, "userId" integer, "items" text NOT NULL DEFAULT ('[]'), CONSTRAINT "REL_fcf8e8a3cbcbaab7e9e595fb31" UNIQUE ("observationId"), CONSTRAINT "FK_3c12c83a8c140f81f85583454cd" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_fcf8e8a3cbcbaab7e9e595fb312" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_protocols"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "userId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "userId" FROM "protocols"`);
        await queryRunner.query(`DROP TABLE "protocols"`);
        await queryRunner.query(`ALTER TABLE "temporary_protocols" RENAME TO "protocols"`);
        await queryRunner.query(`DROP INDEX "IDX_readings_name"`);
        await queryRunner.query(`CREATE TABLE "temporary_readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, "type" varchar CHECK( "type" IN ('marker','data') ) NOT NULL DEFAULT ('data'), CONSTRAINT "FK_d515abc7191c59a85bd1da94fb2" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_readings"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId" FROM "readings"`);
        await queryRunner.query(`DROP TABLE "readings"`);
        await queryRunner.query(`ALTER TABLE "temporary_readings" RENAME TO "readings"`);
        await queryRunner.query(`CREATE INDEX "IDX_readings_name" ON "readings" ("name") `);
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
        await queryRunner.query(`DROP INDEX "IDX_readings_name"`);
        await queryRunner.query(`ALTER TABLE "readings" RENAME TO "temporary_readings"`);
        await queryRunner.query(`CREATE TABLE "readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, CONSTRAINT "FK_d515abc7191c59a85bd1da94fb2" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "readings"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId" FROM "temporary_readings"`);
        await queryRunner.query(`DROP TABLE "temporary_readings"`);
        await queryRunner.query(`CREATE INDEX "IDX_readings_name" ON "readings" ("name") `);
        await queryRunner.query(`ALTER TABLE "protocols" RENAME TO "temporary_protocols"`);
        await queryRunner.query(`CREATE TABLE "protocols" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, "userId" integer, CONSTRAINT "REL_fcf8e8a3cbcbaab7e9e595fb31" UNIQUE ("observationId"), CONSTRAINT "FK_3c12c83a8c140f81f85583454cd" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_fcf8e8a3cbcbaab7e9e595fb312" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "protocols"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "userId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "userId" FROM "temporary_protocols"`);
        await queryRunner.query(`DROP TABLE "temporary_protocols"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
    }

}
