import { MigrationInterface, QueryRunner } from "typeorm";

export class addObservationModule1742245965719 implements MigrationInterface {
    name = 'addObservationModule1742245965719'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user-jwt" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "username" varchar(255) NOT NULL, "password" varchar(255) NOT NULL, "activated" boolean NOT NULL DEFAULT (0), "activationToken" varchar(255), "forgetPasswordToken" varchar(255))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_da3d4c8b2930a74df43eec09be" ON "user-jwt" ("username") `);
        await queryRunner.query(`CREATE TABLE "licenses" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "type" varchar CHECK( "type" IN ('Student','Ultimate','Support') ) NOT NULL, "dateMode" varchar CHECK( "dateMode" IN ('Duration','Date') ) NOT NULL, "startDate" date NOT NULL, "endDate" date, "duration" integer, "hasTimeLimit" boolean NOT NULL DEFAULT (1), "renewable" boolean, "actographWebsiteId" integer NOT NULL, "owner" text, "enabled" boolean NOT NULL DEFAULT (0), "userId" integer)`);
        await queryRunner.query(`CREATE TABLE "protocols" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, "userId" integer, CONSTRAINT "REL_fcf8e8a3cbcbaab7e9e595fb31" UNIQUE ("observationId"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"))`);
        await queryRunner.query(`CREATE TABLE "activity-graphs" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, CONSTRAINT "REL_a80c313e0a4eef7f322e2d3378" UNIQUE ("observationId"))`);
        await queryRunner.query(`CREATE TABLE "readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer)`);
        await queryRunner.query(`CREATE INDEX "IDX_readings_name" ON "readings" ("name") `);
        await queryRunner.query(`CREATE TABLE "observations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" varchar NOT NULL, "description" text, "userId" integer)`);
        await queryRunner.query(`CREATE INDEX "IDX_observations_name" ON "observations" ("name") `);
        await queryRunner.query(`CREATE TABLE "temporary_licenses" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "type" varchar CHECK( "type" IN ('Student','Ultimate','Support') ) NOT NULL, "dateMode" varchar CHECK( "dateMode" IN ('Duration','Date') ) NOT NULL, "startDate" date NOT NULL, "endDate" date, "duration" integer, "hasTimeLimit" boolean NOT NULL DEFAULT (1), "renewable" boolean, "actographWebsiteId" integer NOT NULL, "owner" text, "enabled" boolean NOT NULL DEFAULT (0), "userId" integer, CONSTRAINT "FK_77982aa27a5dad35d47ce3f9ac8" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_licenses"("id", "createdAt", "updatedAt", "deletedAt", "type", "dateMode", "startDate", "endDate", "duration", "hasTimeLimit", "renewable", "actographWebsiteId", "owner", "enabled", "userId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "type", "dateMode", "startDate", "endDate", "duration", "hasTimeLimit", "renewable", "actographWebsiteId", "owner", "enabled", "userId" FROM "licenses"`);
        await queryRunner.query(`DROP TABLE "licenses"`);
        await queryRunner.query(`ALTER TABLE "temporary_licenses" RENAME TO "licenses"`);
        await queryRunner.query(`CREATE TABLE "temporary_protocols" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, "userId" integer, CONSTRAINT "REL_fcf8e8a3cbcbaab7e9e595fb31" UNIQUE ("observationId"), CONSTRAINT "FK_fcf8e8a3cbcbaab7e9e595fb312" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_3c12c83a8c140f81f85583454cd" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_protocols"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "userId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "userId" FROM "protocols"`);
        await queryRunner.query(`DROP TABLE "protocols"`);
        await queryRunner.query(`ALTER TABLE "temporary_protocols" RENAME TO "protocols"`);
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
        await queryRunner.query(`CREATE TABLE "temporary_activity-graphs" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, CONSTRAINT "REL_a80c313e0a4eef7f322e2d3378" UNIQUE ("observationId"), CONSTRAINT "FK_a80c313e0a4eef7f322e2d33786" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_activity-graphs"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId" FROM "activity-graphs"`);
        await queryRunner.query(`DROP TABLE "activity-graphs"`);
        await queryRunner.query(`ALTER TABLE "temporary_activity-graphs" RENAME TO "activity-graphs"`);
        await queryRunner.query(`DROP INDEX "IDX_readings_name"`);
        await queryRunner.query(`CREATE TABLE "temporary_readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, CONSTRAINT "FK_d515abc7191c59a85bd1da94fb2" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_readings"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId" FROM "readings"`);
        await queryRunner.query(`DROP TABLE "readings"`);
        await queryRunner.query(`ALTER TABLE "temporary_readings" RENAME TO "readings"`);
        await queryRunner.query(`CREATE INDEX "IDX_readings_name" ON "readings" ("name") `);
        await queryRunner.query(`DROP INDEX "IDX_observations_name"`);
        await queryRunner.query(`CREATE TABLE "temporary_observations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" varchar NOT NULL, "description" text, "userId" integer, CONSTRAINT "FK_9ccf030cdb323213423413bb623" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_observations"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "userId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "userId" FROM "observations"`);
        await queryRunner.query(`DROP TABLE "observations"`);
        await queryRunner.query(`ALTER TABLE "temporary_observations" RENAME TO "observations"`);
        await queryRunner.query(`CREATE INDEX "IDX_observations_name" ON "observations" ("name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_observations_name"`);
        await queryRunner.query(`ALTER TABLE "observations" RENAME TO "temporary_observations"`);
        await queryRunner.query(`CREATE TABLE "observations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" varchar NOT NULL, "description" text, "userId" integer)`);
        await queryRunner.query(`INSERT INTO "observations"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "userId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "userId" FROM "temporary_observations"`);
        await queryRunner.query(`DROP TABLE "temporary_observations"`);
        await queryRunner.query(`CREATE INDEX "IDX_observations_name" ON "observations" ("name") `);
        await queryRunner.query(`DROP INDEX "IDX_readings_name"`);
        await queryRunner.query(`ALTER TABLE "readings" RENAME TO "temporary_readings"`);
        await queryRunner.query(`CREATE TABLE "readings" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer)`);
        await queryRunner.query(`INSERT INTO "readings"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId" FROM "temporary_readings"`);
        await queryRunner.query(`DROP TABLE "temporary_readings"`);
        await queryRunner.query(`CREATE INDEX "IDX_readings_name" ON "readings" ("name") `);
        await queryRunner.query(`ALTER TABLE "activity-graphs" RENAME TO "temporary_activity-graphs"`);
        await queryRunner.query(`CREATE TABLE "activity-graphs" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, CONSTRAINT "REL_a80c313e0a4eef7f322e2d3378" UNIQUE ("observationId"))`);
        await queryRunner.query(`INSERT INTO "activity-graphs"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId" FROM "temporary_activity-graphs"`);
        await queryRunner.query(`DROP TABLE "temporary_activity-graphs"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"))`);
        await queryRunner.query(`INSERT INTO "users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
        await queryRunner.query(`ALTER TABLE "protocols" RENAME TO "temporary_protocols"`);
        await queryRunner.query(`CREATE TABLE "protocols" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "name" text, "description" text, "observationId" integer, "userId" integer, CONSTRAINT "REL_fcf8e8a3cbcbaab7e9e595fb31" UNIQUE ("observationId"))`);
        await queryRunner.query(`INSERT INTO "protocols"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "userId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "userId" FROM "temporary_protocols"`);
        await queryRunner.query(`DROP TABLE "temporary_protocols"`);
        await queryRunner.query(`ALTER TABLE "licenses" RENAME TO "temporary_licenses"`);
        await queryRunner.query(`CREATE TABLE "licenses" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "type" varchar CHECK( "type" IN ('Student','Ultimate','Support') ) NOT NULL, "dateMode" varchar CHECK( "dateMode" IN ('Duration','Date') ) NOT NULL, "startDate" date NOT NULL, "endDate" date, "duration" integer, "hasTimeLimit" boolean NOT NULL DEFAULT (1), "renewable" boolean, "actographWebsiteId" integer NOT NULL, "owner" text, "enabled" boolean NOT NULL DEFAULT (0), "userId" integer)`);
        await queryRunner.query(`INSERT INTO "licenses"("id", "createdAt", "updatedAt", "deletedAt", "type", "dateMode", "startDate", "endDate", "duration", "hasTimeLimit", "renewable", "actographWebsiteId", "owner", "enabled", "userId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "type", "dateMode", "startDate", "endDate", "duration", "hasTimeLimit", "renewable", "actographWebsiteId", "owner", "enabled", "userId" FROM "temporary_licenses"`);
        await queryRunner.query(`DROP TABLE "temporary_licenses"`);
        await queryRunner.query(`DROP INDEX "IDX_observations_name"`);
        await queryRunner.query(`DROP TABLE "observations"`);
        await queryRunner.query(`DROP INDEX "IDX_readings_name"`);
        await queryRunner.query(`DROP TABLE "readings"`);
        await queryRunner.query(`DROP TABLE "activity-graphs"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "protocols"`);
        await queryRunner.query(`DROP TABLE "licenses"`);
        await queryRunner.query(`DROP INDEX "IDX_da3d4c8b2930a74df43eec09be"`);
        await queryRunner.query(`DROP TABLE "user-jwt"`);
    }

}
