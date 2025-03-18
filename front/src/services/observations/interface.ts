import { IEntity } from '@services/utils/entity.interface';
import { IUser } from '@services/users/user.interface';

export interface IActivityGraph extends IEntity {
  name: string;
  description?: string;
  observation?: IObservation;
}

export interface IProtocol extends IEntity {
  name: string;
  description?: string;
  observation?: IObservation;
  user?: IUser;
}

export interface IReading extends IEntity {
  name: string;
  description?: string;
  observation?: IObservation;
}

export interface IObservation extends IEntity {
  name: string;
  description?: string;
  user: IUser;
  protocol?: IProtocol;
  readings?: IReading[];
  activityGraph?: IActivityGraph;
}
