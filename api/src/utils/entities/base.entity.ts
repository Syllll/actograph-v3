import { GROUP_ADMIN } from '@users/serializationGroups/groups';
import { Expose } from 'class-transformer';
import {
  BaseEntity as TOBaseEntity,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ObjectLiteral,
} from 'typeorm';
// import { Exclude } from 'class-transformer'

export abstract class BaseEntity implements ObjectLiteral {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Expose({ groups: [GROUP_ADMIN] })
  @DeleteDateColumn({ nullable: true, default: null })
  deletedAt?: Date;
}
