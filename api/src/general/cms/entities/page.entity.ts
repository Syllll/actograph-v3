import { Column, Entity, Index, ManyToOne, OneToMany, ManyToMany, OneToOne, JoinColumn } from 'typeorm';
import { IsEmail, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { BaseEntity } from '@utils/entities/base.entity';
import { User } from '@users/entities/user.entity';
import { Bloc } from './bloc.entity';

export enum PageTypeEnum {
  PAGE = 'page',
}

export enum PageStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity("cms-pages")
export class Page extends BaseEntity {
  @Column('varchar', { nullable: false, length: 5000 })
  @Index({ unique: true })
  name!: string;

  @Column('varchar', { nullable: false, length: 5000 })
  @Index()
  url!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('enum', { enum: PageStatusEnum, nullable: false })
  @Index()
  status!: PageStatusEnum;

  @Column('enum', { enum: PageTypeEnum, default: PageTypeEnum.PAGE })
  @Index()
  type!: PageTypeEnum;

  @ManyToOne(() => User)
  createdBy?: User;

  @ManyToOne(() => Bloc)
  @JoinColumn()
  layout?: Bloc;

  @OneToOne(() => Bloc, (b: Bloc) => b.page)
  @JoinColumn()
  content?: Bloc;
}