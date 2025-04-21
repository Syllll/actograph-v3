import { MigrationInterface, QueryRunner } from "typeorm";

export class addTempId1745247869971 implements MigrationInterface {
  name = 'addTempId1745247869971'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "readings" ADD "tempId" text`);
    await queryRunner.query(`CREATE INDEX "IDX_0912c2519ffb7fb78b85d73746" ON "readings" ("tempId") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_0912c2519ffb7fb78b85d73746"`);
    await queryRunner.query(`ALTER TABLE "readings" DROP COLUMN "tempId"`);

  }

}
