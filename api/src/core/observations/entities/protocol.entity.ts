import { InternalServerErrorException } from '@nestjs/common';
import { User } from '@users/entities/user.entity';
import { BaseEntity } from '@utils/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Observation } from './observation.entity';

@Entity('protocols')
export class Protocol extends BaseEntity {
  @Column({ type: 'text', nullable: true })
  name?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @OneToOne(() => Observation, (observation) => observation.protocol)
  @JoinColumn()
  observation?: Observation;

  // A protocol belongs to a user
  @ManyToOne(() => User, (user) => user.protocols)
  @JoinColumn()
  user?: User;
}