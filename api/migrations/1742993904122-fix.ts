import { MigrationInterface, QueryRunner } from "typeorm";

export class fix1742993904122 implements MigrationInterface {
    name = 'fix1742993904122'

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX "IDX_readings_name"`);
      await queryRunner.query(`DROP INDEX "IDX_5366245c5f6fda26c12b32c279"`);
      await queryRunner.query(`DROP INDEX "IDX_95978bb5aa1c7052e8e60bfcfc"`);
      await queryRunner.query(`DROP INDEX "IDX_8385cc50e7d2b528f176d007f1"`);
      await queryRunner.query(`DROP INDEX "IDX_9690f494454a46bf66dc48c903"`);
      
      await queryRunner.query(`ALTER TABLE "readings" RENAME TO "temporary_readings"`);
      await queryRunner.query(`CREATE TABLE "readings" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, 
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')), 
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), 
          "deletedAt" datetime, 
          "name" text, 
          "description" text, 
          "observationId" integer, 
          "type" varchar CHECK( "type" IN ('start','stop','pause_start','pause_end','data') ) NOT NULL DEFAULT ('data'), 
          "dateTime" datetime NOT NULL, 
          CONSTRAINT "FK_d515abc7191c59a85bd1da94fb2" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )`);
      await queryRunner.query(`INSERT INTO "readings"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "type", "dateTime") 
          SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", 
          CASE "type" 
              WHEN 'marker' THEN 'data' 
              ELSE "type" 
          END, 
          "dateTime" FROM "temporary_readings"`);
      await queryRunner.query(`DROP TABLE "temporary_readings"`);
      
      await queryRunner.query(`CREATE INDEX "IDX_readings_name" ON "readings" ("name") `);
      await queryRunner.query(`CREATE INDEX "IDX_5366245c5f6fda26c12b32c279" ON "readings" ("createdAt") `);
      await queryRunner.query(`CREATE INDEX "IDX_95978bb5aa1c7052e8e60bfcfc" ON "readings" ("updatedAt") `);
      await queryRunner.query(`CREATE INDEX "IDX_8385cc50e7d2b528f176d007f1" ON "readings" ("deletedAt") `);
      await queryRunner.query(`CREATE INDEX "IDX_9690f494454a46bf66dc48c903" ON "readings" ("dateTime") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX "IDX_readings_name"`);
      await queryRunner.query(`DROP INDEX "IDX_5366245c5f6fda26c12b32c279"`);
      await queryRunner.query(`DROP INDEX "IDX_95978bb5aa1c7052e8e60bfcfc"`);
      await queryRunner.query(`DROP INDEX "IDX_8385cc50e7d2b528f176d007f1"`);
      await queryRunner.query(`DROP INDEX "IDX_9690f494454a46bf66dc48c903"`);
      
      await queryRunner.query(`ALTER TABLE "readings" RENAME TO "temporary_readings"`);
      await queryRunner.query(`CREATE TABLE "readings" (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, 
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')), 
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), 
          "deletedAt" datetime, 
          "name" text, 
          "description" text, 
          "observationId" integer, 
          "type" varchar CHECK( "type" IN ('marker','data') ) NOT NULL DEFAULT ('data'), 
          "dateTime" datetime NOT NULL, 
          CONSTRAINT "FK_d515abc7191c59a85bd1da94fb2" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )`);
      await queryRunner.query(`INSERT INTO "readings"("id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", "type", "dateTime") 
          SELECT "id", "createdAt", "updatedAt", "deletedAt", "name", "description", "observationId", 
          CASE "type" 
              WHEN 'start' THEN 'marker' 
              WHEN 'stop' THEN 'marker' 
              WHEN 'pause_start' THEN 'marker' 
              WHEN 'pause_end' THEN 'marker' 
              ELSE "type" 
          END, 
          "dateTime" FROM "temporary_readings"`);
      await queryRunner.query(`DROP TABLE "temporary_readings"`);
      
      await queryRunner.query(`CREATE INDEX "IDX_readings_name" ON "readings" ("name") `);
      await queryRunner.query(`CREATE INDEX "IDX_5366245c5f6fda26c12b32c279" ON "readings" ("createdAt") `);
      await queryRunner.query(`CREATE INDEX "IDX_95978bb5aa1c7052e8e60bfcfc" ON "readings" ("updatedAt") `);
      await queryRunner.query(`CREATE INDEX "IDX_8385cc50e7d2b528f176d007f1" ON "readings" ("deletedAt") `);
      await queryRunner.query(`CREATE INDEX "IDX_9690f494454a46bf66dc48c903" ON "readings" ("dateTime") `);
  }

}
