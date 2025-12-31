import { ObservationType, ObservationModeEnum } from '../enums';
import { IReading } from './reading.types';
import { IProtocol } from './protocol.types';

/**
 * Observation interface (without TypeORM decorators)
 */
export interface IObservation {
  id?: number;
  name: string;
  description?: string | null;
  type: ObservationType;
  videoPath?: string | null;
  mode?: ObservationModeEnum | null;
  readings?: IReading[];
  protocol?: IProtocol;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

