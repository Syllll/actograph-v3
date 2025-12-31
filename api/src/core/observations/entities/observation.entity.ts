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
} from 'typeorm';
import { ActivityGraph } from './activity-graph.entity';
import { Protocol } from './protocol.entity';
import { Reading } from './reading.entity';
import { ObservationType, ObservationModeEnum } from '@actograph/core';

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
