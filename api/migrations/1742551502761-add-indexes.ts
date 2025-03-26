import { MigrationInterface, QueryRunner } from "typeorm";

export class addIndexes1742551502761 implements MigrationInterface {
    name = 'addIndexes1742551502761'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
        await queryRunner.query(`CREATE INDEX "IDX_eb22a55673bc70e67c9d9929ee" ON "user-jwt" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_d84e51544d245e178d30c3becb" ON "user-jwt" ("updatedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_2240908b2adeef7a53c4cc7043" ON "user-jwt" ("deletedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_beda0b58acd76f2829f901394d" ON "licenses" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_02ec218101eea5ab0ab6b17598" ON "licenses" ("updatedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_49f7111ffbd52149ab8fcd6101" ON "licenses" ("deletedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_f210f7735e75a04f0d9ee562b0" ON "protocols" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_54add23b08f19e9733059f1953" ON "protocols" ("updatedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_9c9b5feb28530487298147d6a9" ON "protocols" ("deletedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_204e9b624861ff4a5b26819210" ON "users" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_0f5cbe00928ba4489cc7312573" ON "users" ("updatedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_2a32f641edba1d0f973c19cc94" ON "users" ("deletedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_345bccf680ffcf24b78e2bce56" ON "activity-graphs" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_0e306a7001278b70fede37c521" ON "activity-graphs" ("updatedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_9f04288a7a855f73af86775943" ON "activity-graphs" ("deletedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_5366245c5f6fda26c12b32c279" ON "readings" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_95978bb5aa1c7052e8e60bfcfc" ON "readings" ("updatedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8385cc50e7d2b528f176d007f1" ON "readings" ("deletedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_9690f494454a46bf66dc48c903" ON "readings" ("dateTime") `);
        await queryRunner.query(`CREATE INDEX "IDX_b4875d9ea93cbf5d5cde9f696f" ON "observations" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_9023cb1e29ea652f6a2ee1c2db" ON "observations" ("updatedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_823219d712c151df81a32c91d9" ON "observations" ("deletedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_823219d712c151df81a32c91d9"`);
        await queryRunner.query(`DROP INDEX "IDX_9023cb1e29ea652f6a2ee1c2db"`);
        await queryRunner.query(`DROP INDEX "IDX_b4875d9ea93cbf5d5cde9f696f"`);
        await queryRunner.query(`DROP INDEX "IDX_9690f494454a46bf66dc48c903"`);
        await queryRunner.query(`DROP INDEX "IDX_8385cc50e7d2b528f176d007f1"`);
        await queryRunner.query(`DROP INDEX "IDX_95978bb5aa1c7052e8e60bfcfc"`);
        await queryRunner.query(`DROP INDEX "IDX_5366245c5f6fda26c12b32c279"`);
        await queryRunner.query(`DROP INDEX "IDX_9f04288a7a855f73af86775943"`);
        await queryRunner.query(`DROP INDEX "IDX_0e306a7001278b70fede37c521"`);
        await queryRunner.query(`DROP INDEX "IDX_345bccf680ffcf24b78e2bce56"`);
        await queryRunner.query(`DROP INDEX "IDX_2a32f641edba1d0f973c19cc94"`);
        await queryRunner.query(`DROP INDEX "IDX_0f5cbe00928ba4489cc7312573"`);
        await queryRunner.query(`DROP INDEX "IDX_204e9b624861ff4a5b26819210"`);
        await queryRunner.query(`DROP INDEX "IDX_9c9b5feb28530487298147d6a9"`);
        await queryRunner.query(`DROP INDEX "IDX_54add23b08f19e9733059f1953"`);
        await queryRunner.query(`DROP INDEX "IDX_f210f7735e75a04f0d9ee562b0"`);
        await queryRunner.query(`DROP INDEX "IDX_49f7111ffbd52149ab8fcd6101"`);
        await queryRunner.query(`DROP INDEX "IDX_02ec218101eea5ab0ab6b17598"`);
        await queryRunner.query(`DROP INDEX "IDX_beda0b58acd76f2829f901394d"`);
        await queryRunner.query(`DROP INDEX "IDX_2240908b2adeef7a53c4cc7043"`);
        await queryRunner.query(`DROP INDEX "IDX_d84e51544d245e178d30c3becb"`);
        await queryRunner.query(`DROP INDEX "IDX_eb22a55673bc70e67c9d9929ee"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "firstname" varchar(200), "lastname" varchar(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT (0), "roles" varchar CHECK( "roles" IN ('admin','user') ) NOT NULL DEFAULT ('user'), "preferDarkTheme" boolean NOT NULL DEFAULT (1), "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "users"("id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId") SELECT "id", "createdAt", "updatedAt", "deletedAt", "firstname", "lastname", "resetPasswordOngoing", "roles", "preferDarkTheme", "userJwtId" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
    }

}
