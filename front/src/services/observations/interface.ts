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

export interface IProtocolItem {
  name: string;
    description?: string;
    action?: ProtocolItemActionEnum;
    type: ProtocolItemTypeEnum;
    protocolId: number;
    order?: number;
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

export interface IObservation extends IEntity {
  name: string;
  description?: string;
  user: IUser;
  protocol?: IProtocol;
  readings?: IReading[];
  activityGraph?: IActivityGraph;
}
