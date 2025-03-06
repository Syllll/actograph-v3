import {
  JoinColumn,
  Column,
  Entity,
  OneToOne,
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  OneToMany,
} from 'typeorm';
import { Expose } from 'class-transformer';

import { BaseEntity } from '@utils/entities/base.entity';
import { UserJwt } from '@auth-jwt/entities/userJwt.entity';
import { GROUP_USER, GROUP_ADMIN } from '../serializationGroups/groups';
import { UserRoleEnum } from '../utils/user-role.enum';
  // glutamat: imports

@Entity("users") 
export class User extends BaseEntity {
  @Expose({ groups: [GROUP_USER, GROUP_ADMIN] })
  @Column('varchar', { length: 200, nullable: true })
  firstname!: string | null;

  @Expose({ groups: [GROUP_USER, GROUP_ADMIN] })
  @Column('varchar', { length: 200, nullable: true })
  lastname!: string | null;

  fullname!: string;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  generateFullName(): void {
    this.fullname = `${this.firstname} ${this.lastname}`;
  }

  @Column('bool', { nullable: false, default: false })
  resetPasswordOngoing!: boolean;

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    default: [UserRoleEnum.User],
    array: true,
    nullable: false,
  })
  roles!: UserRoleEnum[];

  @Column('bool', { nullable: false, default: true })
  preferDarkTheme!: boolean;

  @Expose()
  get isAdmin(): boolean {
    return this.roles.includes(UserRoleEnum.Admin);
  }

  // ****
  // ! Relations
  // ****
  // glutamat: relations
  
  @OneToOne(() => UserJwt, {
    cascade: ['update', 'remove', 'soft-remove'],
    eager: false,
  })
  @JoinColumn()
  userJwt!: UserJwt;

  constructor(partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }
}

export const allRelations = [];
