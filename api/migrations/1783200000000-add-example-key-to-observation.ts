import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExampleKeyToObservation1783200000000 implements MigrationInterface {
    name = 'AddExampleKeyToObservation1783200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "observations" ADD COLUMN "exampleKey" text`);
        await queryRunner.query(`CREATE INDEX "IDX_observations_exampleKey" ON "observations" ("exampleKey") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_observations_exampleKey"`);
        await queryRunner.query(`ALTER TABLE "observations" DROP COLUMN "exampleKey"`);
    }
}
