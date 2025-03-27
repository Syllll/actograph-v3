import { InternalServerErrorException } from '@nestjs/common';
import { User } from '@users/entities/user.entity';
import { BaseEntity } from '@utils/entities/base.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Observation } from './observation.entity';

@Entity('activity-graphs')
export class ActivityGraph extends BaseEntity {
  @Column({ type: 'text', nullable: true })
  name?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @OneToOne(() => Observation, (observation) => observation.activityGraph)
  @JoinColumn()
  observation?: Observation;
}
