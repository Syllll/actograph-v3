import { InternalServerErrorException } from '@nestjs/common';
import { User } from '@users/entities/user.entity';
import { BaseEntity } from '@utils/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Observation } from './observation.entity';

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
}