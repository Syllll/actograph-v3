import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadingSortOrder1792600000000 implements MigrationInterface {
  name = 'AddReadingSortOrder1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "readings" ADD COLUMN "sortOrder" integer');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "readings" DROP COLUMN "sortOrder"');
  }
}
