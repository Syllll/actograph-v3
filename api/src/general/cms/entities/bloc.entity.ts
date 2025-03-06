import { Column, Entity, Index, ManyToOne, ManyToMany, JoinTable, OneToOne } from 'typeorm';
import { IsEmail, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { BaseEntity } from '@utils/entities/base.entity';
import { User } from '@users/entities/user.entity';
import { Page } from './page.entity';

export enum BlocTypeEnum {
  PAGE_CONTENT = 'page-content',
  LAYOUT = 'layout',
  COMPONENT = 'component',
  OTHERS = 'others',
}

export enum BlocStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity("cms-blocs")
export class Bloc extends BaseEntity {
  @Column('varchar', { nullable: false, length: 5000 })
  @Index()
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('enum', { enum: BlocStatusEnum, nullable: false })
  @Index()
  status!: BlocStatusEnum;

  @Column('enum', { enum: BlocTypeEnum, nullable: false })
  @Index()
  type!: BlocTypeEnum;

  @Column('jsonb', { nullable: true, select: false })
  content?: object;

  @ManyToOne(() => User)
  createdBy?: User;

  @ManyToOne(() => User)
  lastModififiedBy?: User;

  @OneToOne(() => Page, (p: Page) => p.content)
  page?: Page;
}