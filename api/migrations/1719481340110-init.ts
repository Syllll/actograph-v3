import { MigrationInterface, QueryRunner } from "typeorm";

export class init1719481340110 implements MigrationInterface {
    name = 'init1719481340110'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user-jwt" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "username" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "activated" boolean NOT NULL DEFAULT false, "activationToken" character varying(255), "forgetPasswordToken" character varying(255), CONSTRAINT "PK_9ddd22ca84c0590e9671d344bda" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_da3d4c8b2930a74df43eec09be" ON "user-jwt" ("username") `);
        await queryRunner.query(`CREATE TYPE "public"."users_roles_enum" AS ENUM('admin', 'user')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "firstname" character varying(200), "lastname" character varying(200), "resetPasswordOngoing" boolean NOT NULL DEFAULT false, "roles" "public"."users_roles_enum" array NOT NULL DEFAULT '{user}', "preferDarkTheme" boolean NOT NULL DEFAULT true, "userJwtId" integer, CONSTRAINT "REL_90a889fe5298daa8a0310df63c" UNIQUE ("userJwtId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."cms-blocs_status_enum" AS ENUM('draft', 'published')`);
        await queryRunner.query(`CREATE TYPE "public"."cms-blocs_type_enum" AS ENUM('page-content', 'layout', 'component', 'others')`);
        await queryRunner.query(`CREATE TABLE "cms-blocs" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying(5000) NOT NULL, "description" text, "status" "public"."cms-blocs_status_enum" NOT NULL, "type" "public"."cms-blocs_type_enum" NOT NULL, "content" jsonb, "createdById" integer, "lastModififiedById" integer, CONSTRAINT "PK_075e3f77fb2486801a3da75c6a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6aa311152225c13261dbd6f587" ON "cms-blocs" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_78d1d611c016691a90abdfec6f" ON "cms-blocs" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_d7595756770d70530641792ce0" ON "cms-blocs" ("type") `);
        await queryRunner.query(`CREATE TYPE "public"."cms-pages_status_enum" AS ENUM('draft', 'published')`);
        await queryRunner.query(`CREATE TYPE "public"."cms-pages_type_enum" AS ENUM('page')`);
        await queryRunner.query(`CREATE TABLE "cms-pages" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying(5000) NOT NULL, "url" character varying(5000) NOT NULL, "description" text, "status" "public"."cms-pages_status_enum" NOT NULL, "type" "public"."cms-pages_type_enum" NOT NULL DEFAULT 'page', "createdById" integer, "layoutId" integer, "contentId" integer, CONSTRAINT "REL_7659c63ab3bd1321e58b20338e" UNIQUE ("layoutId"), CONSTRAINT "REL_492328ebe507d4969216b541de" UNIQUE ("contentId"), CONSTRAINT "PK_dbeb7432e98622e014720bdb078" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_449d4b1524c9ce4aa31e3b215a" ON "cms-pages" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_e1b055809d9c439e71bdfd6c5b" ON "cms-pages" ("url") `);
        await queryRunner.query(`CREATE INDEX "IDX_a420ee7cc32e08ea066b76a382" ON "cms-pages" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_77cee8ad7a1bb7af8321ecc267" ON "cms-pages" ("type") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_90a889fe5298daa8a0310df63cb" FOREIGN KEY ("userJwtId") REFERENCES "user-jwt"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cms-blocs" ADD CONSTRAINT "FK_c3379136080eabe968796154355" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cms-blocs" ADD CONSTRAINT "FK_5d4338f7eddd16a7980ccc88e75" FOREIGN KEY ("lastModififiedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cms-pages" ADD CONSTRAINT "FK_bc8ee05d5b1406e9f8612f3ae87" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cms-pages" ADD CONSTRAINT "FK_7659c63ab3bd1321e58b20338e6" FOREIGN KEY ("layoutId") REFERENCES "cms-blocs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cms-pages" ADD CONSTRAINT "FK_492328ebe507d4969216b541dec" FOREIGN KEY ("contentId") REFERENCES "cms-blocs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cms-pages" DROP CONSTRAINT "FK_492328ebe507d4969216b541dec"`);
        await queryRunner.query(`ALTER TABLE "cms-pages" DROP CONSTRAINT "FK_7659c63ab3bd1321e58b20338e6"`);
        await queryRunner.query(`ALTER TABLE "cms-pages" DROP CONSTRAINT "FK_bc8ee05d5b1406e9f8612f3ae87"`);
        await queryRunner.query(`ALTER TABLE "cms-blocs" DROP CONSTRAINT "FK_5d4338f7eddd16a7980ccc88e75"`);
        await queryRunner.query(`ALTER TABLE "cms-blocs" DROP CONSTRAINT "FK_c3379136080eabe968796154355"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_90a889fe5298daa8a0310df63cb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_77cee8ad7a1bb7af8321ecc267"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a420ee7cc32e08ea066b76a382"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e1b055809d9c439e71bdfd6c5b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_449d4b1524c9ce4aa31e3b215a"`);
        await queryRunner.query(`DROP TABLE "cms-pages"`);
        await queryRunner.query(`DROP TYPE "public"."cms-pages_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."cms-pages_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d7595756770d70530641792ce0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78d1d611c016691a90abdfec6f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6aa311152225c13261dbd6f587"`);
        await queryRunner.query(`DROP TABLE "cms-blocs"`);
        await queryRunner.query(`DROP TYPE "public"."cms-blocs_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."cms-blocs_status_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_roles_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da3d4c8b2930a74df43eec09be"`);
        await queryRunner.query(`DROP TABLE "user-jwt"`);
    }

}
