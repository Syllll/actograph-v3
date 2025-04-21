import { Column, Entity, Index } from 'typeorm';
import { IsEmail, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

import { BaseEntity } from '@utils/entities/base.entity';

export class UserJwtCreateDto {
  @IsNotEmpty()
  username!: string;

  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsBoolean()
  activated?: boolean;
}

@Entity('user-jwt')
export class UserJwt extends BaseEntity {
  @Column('varchar', { nullable: false, length: 255 })
  @Index({ unique: true })
  username!: string;

  @Column('varchar', {
    name: 'password',
    nullable: false,
    length: 255,
    select: false,
  })
  password!: string;

  @Column('boolean', { name: 'activated', default: false })
  activated = false;

  @Column('varchar', {
    name: 'activationToken',
    nullable: true,
    length: 255,
    select: false,
  })
  activationToken!: string | null;

  @Column('varchar', {
    name: 'forgetPasswordToken',
    nullable: true,
    length: 255,
    select: false,
  })
  forgetPasswordToken!: string | null;
} 