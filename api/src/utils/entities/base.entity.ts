import { GROUP_ADMIN } from '@users/serializationGroups/groups';
import { Expose } from 'class-transformer';
import {
  BaseEntity as TOBaseEntity,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ObjectLiteral,
  Index,
} from 'typeorm';
// import { Exclude } from 'class-transformer'

export abstract class BaseEntity implements ObjectLiteral {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;

  @UpdateDateColumn()
  @Index()
  updatedAt!: Date;

  @Expose({ groups: [GROUP_ADMIN] })
  @DeleteDateColumn({ nullable: true, default: null })
  @Index()
  deletedAt?: Date;
}
