import { ReadingTypeEnum, type IReading, type IProtocolItem } from '@services/observations/interface';
import { buildObservableCategories, indexObservableCategories } from 'src/pages/userspace/observation/_components/readings-side/observable-categories';

export const unmatchedReadings = (readings: IReading[], items: IProtocolItem[] = []): IReading[] => {
  const index = indexObservableCategories(buildObservableCategories(items));
  return readings.filter((row) => row.type === ReadingTypeEnum.DATA && !row.name?.startsWith('#') && (!row.name || !index.has(row.name)));
};

export const ambiguousReadings = (readings: IReading[], items: IProtocolItem[] = []): IReading[] => {
  const index = indexObservableCategories(buildObservableCategories(items));
  return readings.filter((row) => row.type === ReadingTypeEnum.DATA && !!row.name && !row.name.startsWith('#') && index.has(row.name) && index.get(row.name) === null);
};
