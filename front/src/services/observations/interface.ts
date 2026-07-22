import { IEntity } from '@services/utils/entity.interface';
import { IUser } from '@services/users/user.interface';
import { ObservationType } from '@actograph/core';

export interface IActivityGraph extends IEntity {
  name: string;
  description?: string;
  observation?: IObservation;
}

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
  visible?: boolean;
}

export interface IProtocolItem {
  id: string;
  name: string;
  description?: string;
  action?: ProtocolItemActionEnum;
  type: ProtocolItemTypeEnum;
  protocolId?: number;
  order?: number;
  graphPreferences?: IGraphPreferences;
  children?: IProtocolItem[];
}

export interface IProtocol extends IEntity {
  name: string;
  description?: string;
  observation?: IObservation;
  user?: IUser;
  items?: string; // JSON string containing protocol categories and observables
  _items?: IProtocolItem[];
}

export enum ReadingTypeEnum {
  START = 'start',
  STOP = 'stop',
  PAUSE_START = 'pause_start',
  PAUSE_END = 'pause_end',
  DATA = 'data',
}

export interface IReading extends Partial<IEntity> {
  id?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  name: string;
  description?: string;
  observation?: IObservation;
  type: ReadingTypeEnum;
  dateTime: Date;
  tempId?: string | null;
}

export enum ObservationModeEnum {
  Calendar = 'calendar',
  Chronometer = 'chronometer',
}

export const OBSERVATION_LOCAL_META_USED_FOR_VALUES = [
  'autoConfrontation',
  'copil',
  'restitution',
  'publication',
  'other',
] as const;

export type ObservationLocalMetaUsedFor =
  (typeof OBSERVATION_LOCAL_META_USED_FOR_VALUES)[number];

export interface IObservationLocalMeta {
  id?: number;
  archived?: boolean;
  isProtocol?: boolean;
  usedFor?: ObservationLocalMetaUsedFor[] | null;
  usedForOther?: string | null;
  note?: string | null;
}

export interface IObservationLocalMetaUpsert {
  archived?: boolean;
  isProtocol?: boolean;
  usedFor?: ObservationLocalMetaUsedFor[];
  usedForOther?: string | null;
  note?: string | null;
}

export interface IObservationLocalMetaResponse {
  observationId: number;
  archived: boolean;
  isProtocol: boolean;
  usedFor: ObservationLocalMetaUsedFor[];
  usedForOther: string | null;
  note: string | null;
}

export function getEffectiveLocalMeta(obs: IObservation): {
  archived: boolean;
  isProtocol: boolean;
  usedFor: ObservationLocalMetaUsedFor[];
  usedForOther: string | null;
  note: string | null;
} {
  return {
    archived: obs.localMeta?.archived ?? false,
    isProtocol: obs.localMeta?.isProtocol ?? false,
    usedFor: obs.localMeta?.usedFor ?? [],
    usedForOther: obs.localMeta?.usedForOther ?? null,
    note: obs.localMeta?.note ?? null,
  };
}

export interface IObservation extends IEntity {
  name: string;
  description?: string;
  type: ObservationType;
  videoPath?: string | null;
  mode?: ObservationModeEnum | null;
  /**
   * Métadonnées de disposition persistées avec la chronic (uiScale, ...).
   * Null/undefined pour les observations anciennes (compat ascendante).
   */
  meta?: Record<string, any> | null;
  user: IUser;
  protocol?: IProtocol;
  readings?: IReading[];
  activityGraph?: IActivityGraph;
  localMeta?: IObservationLocalMeta | null;
}
