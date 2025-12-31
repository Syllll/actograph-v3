import { ReadingTypeEnum } from '../enums';

/**
 * Reading interface (without TypeORM decorators)
 */
export interface IReading {
  id?: number;
  name?: string | null;
  description?: string | null;
  type: ReadingTypeEnum;
  dateTime: Date;
  tempId?: string | null;
}

