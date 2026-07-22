import { User } from '@users/entities/user.entity';
import { BaseEntity } from '@utils/entities/base.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  ValueTransformer,
} from 'typeorm';
import { ActivityGraph } from './activity-graph.entity';
import { Protocol } from './protocol.entity';
import { Reading } from './reading.entity';
import { ObservationType, ObservationModeEnum } from '@actograph/core';

/**
 * Transformeur pour la colonne `meta`.
 *
 * La colonne est `text` (compatible sqlite + postgres) et stocke un JSON.
 * Côté code on manipule un objet ; côté DB on sérialise/désérialise.
 * Gère null/undefined et les chaînes invalides (renvoie null plutôt que
 * de planter, pour rester robuste face aux anciennes données).
 */
const metaTransformer: ValueTransformer = {
  to(value: Record<string, any> | null | undefined): string | null {
    if (value == null) return null;
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  },
  from(value: string | null | undefined): Record<string, any> | null {
    if (!value || typeof value !== 'string') return null;
    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return null;
    }
  },
};

@Entity('observations')
export class Observation extends BaseEntity {
  @Column({ nullable: false })
  @Index('IDX_observations_name')
  name!: string;

  /**
   * Type d'observation (Example ou Normal)
   * 
   * Note: `type: 'text'` est requis pour la compatibilité SQLite.
   * SQLite ne supporte pas les enums natifs.
   */
  @Column({ type: 'text', enum: ObservationType, default: ObservationType.Normal })
  type!: ObservationType;

  /**
   * Clé identifiant un exemple intégré (uniquement pour type=Example).
   * Permet de gérer plusieurs exemples intégrés (ex: "default", "faire-le-cafe").
   * Null pour les observations utilisateur (type=Normal).
   */
  @Column({ type: 'text', nullable: true })
  @Index('IDX_observations_exampleKey')
  exampleKey?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  videoPath?: string | null;

  /**
   * Mode d'observation (Calendar ou Chronometer)
   * 
   * Note: `type: 'text'` est requis pour la compatibilité SQLite.
   * SQLite ne supporte pas les enums natifs.
   */
  @Column({ type: 'text', enum: ObservationModeEnum, nullable: true })
  mode?: ObservationModeEnum | null;

  /**
   * Métadonnées d'observation persistées avec la chronic (uiScale, ...).
   * Stockées en JSON text (voir metaTransformer) ; null pour les
   * observations créées avant l'ajout de la colonne (compat ascendante).
   */
  @Column({ type: 'text', nullable: true, transformer: metaTransformer })
  meta?: Record<string, any> | null;

  @OneToOne(() => ActivityGraph, (activityGraph) => activityGraph.observation)
  activityGraph?: ActivityGraph;

  @OneToMany(() => Reading, (reading) => reading.observation)
  readings?: Reading[];

  @ManyToOne(() => User, (user) => user.observations)
  @JoinColumn()
  user?: User;

  @OneToOne(() => Protocol, (protocol) => protocol.observation)
  protocol?: Protocol;
}
