import { BaseEntity } from '@utils/entities/base.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  ValueTransformer,
} from 'typeorm';
import { Observation } from './observation.entity';

export const OBSERVATION_LOCAL_META_USED_FOR_VALUES = [
  'autoConfrontation',
  'copil',
  'restitution',
  'publication',
  'other',
] as const;

export type ObservationLocalMetaUsedFor =
  (typeof OBSERVATION_LOCAL_META_USED_FOR_VALUES)[number];

const usedForTransformer: ValueTransformer = {
  to(value: string[] | null | undefined): string | null {
    if (value == null) return null;
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  },
  from(value: string | null | undefined): string[] | null {
    if (!value || typeof value !== 'string') return null;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
};

@Entity('observation_local_meta')
export class ObservationLocalMeta extends BaseEntity {
  @OneToOne(() => Observation, (observation) => observation.localMeta)
  @JoinColumn()
  @Index('IDX_observation_local_meta_observation', { unique: true })
  observation!: Observation;

  @Column({ type: 'boolean', default: false })
  archived!: boolean;

  @Column({ type: 'boolean', default: false })
  isProtocol!: boolean;

  @Column({
    type: 'text',
    nullable: true,
    transformer: usedForTransformer,
  })
  usedFor?: string[] | null;

  @Column({ type: 'text', nullable: true })
  usedForOther?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
