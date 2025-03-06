import { MigrationInterface, QueryRunner } from "typeorm";

export class cmsFixRelations1719824522804 implements MigrationInterface {
    name = 'cmsFixRelations1719824522804'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cms-pages" DROP CONSTRAINT "FK_7659c63ab3bd1321e58b20338e6"`);
        await queryRunner.query(`ALTER TABLE "cms-pages" ALTER COLUMN "type" SET DEFAULT 'page'`);
        await queryRunner.query(`ALTER TABLE "cms-pages" DROP CONSTRAINT "REL_7659c63ab3bd1321e58b20338e"`);
        await queryRunner.query(`ALTER TABLE "cms-pages" ADD CONSTRAINT "FK_7659c63ab3bd1321e58b20338e6" FOREIGN KEY ("layoutId") REFERENCES "cms-blocs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cms-pages" DROP CONSTRAINT "FK_7659c63ab3bd1321e58b20338e6"`);
        await queryRunner.query(`ALTER TABLE "cms-pages" ADD CONSTRAINT "REL_7659c63ab3bd1321e58b20338e" UNIQUE ("layoutId")`);
        await queryRunner.query(`ALTER TABLE "cms-pages" ALTER COLUMN "type" SET DEFAULT 'page'-pages_type_enum"`);
        await queryRunner.query(`ALTER TABLE "cms-pages" ADD CONSTRAINT "FK_7659c63ab3bd1321e58b20338e6" FOREIGN KEY ("layoutId") REFERENCES "cms-blocs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
