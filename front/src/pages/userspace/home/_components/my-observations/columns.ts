import { IObservation } from '@services/observations/interface';
import { relativeDay } from '@lib-improba/utils/date-format.utils';

export const columns = [
  {
    name: 'name',
    align: 'left' as const,
    label: 'Nom',
    sortable: true,
    field: (row: IObservation) => row.name,
    format: (val: any) => val,
  },
  {
    name: 'updatedAt',
    align: 'left' as const,
    label: 'Date de dernière modification',
    sortable: true,
    field: (row: IObservation) => row.updatedAt,
    format: (val: string) => relativeDay(val),
  },
];
