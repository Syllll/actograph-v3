import { IEntity } from '@services/utils/entity.interface';
import { IUser } from '@services/users/user.interface';

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

export interface IReading extends IEntity {
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

export interface IObservation extends IEntity {
  name: string;
  description?: string;
  videoPath?: string | null;
  mode?: ObservationModeEnum | null;
  user: IUser;
  protocol?: IProtocol;
  readings?: IReading[];
  activityGraph?: IActivityGraph;
}
