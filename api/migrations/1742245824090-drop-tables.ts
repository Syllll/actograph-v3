import { MigrationInterface, QueryRunner } from "typeorm";

export class dropTables1742245824090 implements MigrationInterface {
    name = 'dropTables1742245824090'

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP TABLE "users"`);
      await queryRunner.query(`DROP TABLE "user-jwt"`);
      await queryRunner.query(`DROP TABLE "licenses"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {  

    }

}