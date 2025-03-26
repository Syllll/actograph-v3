import { InternalServerErrorException } from '@nestjs/common';
import { User } from '@users/entities/user.entity';
import { BaseEntity } from '@utils/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { ActivityGraph } from './activity-graph.entity';
import { Protocol } from './protocol.entity';
import { Reading } from './reading.entity';

export enum ObservationType {
  Example = 'example',
  Normal = 'normal',
}

@Entity('observations')
export class Observation extends BaseEntity {
  @Column({ nullable: false })
  @Index('IDX_observations_name')
  name!: string;

  @Column({ enum: ObservationType, default: ObservationType.Normal })
  type!: ObservationType;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

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