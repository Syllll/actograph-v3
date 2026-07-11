import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ajoute une colonne `meta` (text, nullable) à la table `observations`.
 *
 * Stocke un JSON libre avec les métadonnées de disposition persistées avec
 * la chronic (ex: `uiScale` pour la taille globale des boutons).
 *
 * Nullable pour préserver les observations existantes : une observation
 * créée avant cette migration aura `meta = NULL` et le code doit toujours
 * traiter ce cas comme "pas de meta" (compatibilité ascendante).
 */
export class AddMetaToObservation1784000000000 implements MigrationInterface {
    name = 'AddMetaToObservation1784000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "observations" ADD COLUMN "meta" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "observations" DROP COLUMN "meta"`);
    }
}
