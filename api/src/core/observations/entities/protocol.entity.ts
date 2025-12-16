import { InternalServerErrorException } from '@nestjs/common';
import { User } from '@users/entities/user.entity';
import { BaseEntity } from '@utils/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Observation } from './observation.entity';

export enum ProtocolItemTypeEnum {
  Category = 'category',
  Observable = 'observable',
}

export enum ProtocolItemActionEnum {
  Continuous = 'continuous',
  Discrete = 'discrete',
}

export enum BackgroundPatternEnum {
  /** Aucun motif - couleur unie */
  Solid = 'solid',
  /** Lignes horizontales */
  Horizontal = 'horizontal',
  /** Lignes verticales */
  Vertical = 'vertical',
  /** Lignes diagonales (/) */
  Diagonal = 'diagonal',
  /** Grille (horizontal + vertical) */
  Grid = 'grid',
  /** Pointillés */
  Dots = 'dots',
}

export enum DisplayModeEnum {
  /** Mode normal : traits horizontaux (step-lines) */
  Normal = 'normal',
  /** Mode arrière-plan : zones colorées sur le fond du graphique (catégorie retirée de l'axe Y) */
  Background = 'background',
  /** Mode frise : bandeau horizontal découpé en zones colorées (catégorie visible sur l'axe Y) */
  Frieze = 'frieze',
}

export interface IGraphPreferences {
  color?: string;
  strokeWidth?: number;
  backgroundPattern?: BackgroundPatternEnum;
  displayMode?: DisplayModeEnum;
  supportCategoryId?: string | null;
}

export interface ProtocolItem {
  type: ProtocolItemTypeEnum;
  id: string;
  name: string;
  description?: string | null;
  action?: ProtocolItemActionEnum;
  meta?: Record<string, any> | null;
  graphPreferences?: IGraphPreferences;
  children?: ProtocolItem[];
}

/**
 * A protocol is made of categories and observables.
 * A category can contain other observables.
 * An observable is a leaf node in the tree.
 *
 */
@Entity('protocols')
export class Protocol extends BaseEntity {
  @Column({ type: 'text', nullable: true })
  name?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @OneToOne(() => Observation, (observation) => observation.protocol)
  @JoinColumn()
  observation?: Observation;

  @Column({ type: 'text', nullable: false, default: '[]' })
  items!: string;

  // A protocol belongs to a user
  @ManyToOne(() => User, (user) => user.protocols)
  @JoinColumn()
  user?: User;
}
