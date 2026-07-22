import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddObservationLocalMeta1785000000000 implements MigrationInterface {
  name = 'AddObservationLocalMeta1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "observation_local_meta" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "deletedAt" datetime,
        "archived" boolean NOT NULL DEFAULT (0),
        "isProtocol" boolean NOT NULL DEFAULT (0),
        "usedFor" text,
        "usedForOther" text,
        "note" text,
        "observationId" integer,
        CONSTRAINT "FK_observation_local_meta_observation" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_observation_local_meta_observation" ON "observation_local_meta" ("observationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_observation_local_meta_observation"`,
    );
    await queryRunner.query(`DROP TABLE "observation_local_meta"`);
  }
}
