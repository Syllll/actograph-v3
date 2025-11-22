import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVideoPathAndModeToObservation1746000000000 implements MigrationInterface {
    name = 'AddVideoPathAndModeToObservation1746000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "observations" ADD COLUMN "videoPath" text`);
        await queryRunner.query(`ALTER TABLE "observations" ADD COLUMN "mode" varchar CHECK( "mode" IN ('calendar','chronometer') )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "observations" DROP COLUMN "mode"`);
        await queryRunner.query(`ALTER TABLE "observations" DROP COLUMN "videoPath"`);
    }
}

