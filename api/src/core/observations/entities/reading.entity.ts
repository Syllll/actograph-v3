import { User } from '@users/entities/user.entity';
import { BaseEntity } from '@utils/entities/base.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Observation } from './observation.entity';
import { ReadingTypeEnum } from '@actograph/core';

@Entity('readings')
export class Reading extends BaseEntity {
  @ManyToOne(() => Observation, (observation) => observation.readings)
  @JoinColumn()
  observation?: Observation;

  @Column({ type: 'text', nullable: true })
  @Index('IDX_readings_name')
  name?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /**
   * Type de reading (START, STOP, PAUSE_START, PAUSE_END, DATA)
   * 
   * Note: `type: 'text'` est requis pour la compatibilité SQLite.
   * SQLite ne supporte pas les enums natifs, donc on stocke la valeur
   * comme texte tout en gardant la validation TypeScript via l'enum.
   */
  @Column({
    type: 'text',
    enum: ReadingTypeEnum,
    default: ReadingTypeEnum.DATA,
    nullable: false,
  })
  type!: ReadingTypeEnum;

  // The date and time of the reading
  @Column({ nullable: false })
  @Index()
  dateTime!: Date;

  // Position explicite pour les relevés qui partagent le même horodatage.
  // Null conserve la compatibilité avec les chroniques antérieures.
  @Column({ type: 'integer', nullable: true })
  sortOrder?: number | null;

  // The temporary id of the reading
  @Column({ type: 'text', nullable: true })
  @Index()
  tempId?: string | null;
}
