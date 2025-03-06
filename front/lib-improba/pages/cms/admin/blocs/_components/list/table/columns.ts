import { IPage } from '@lib-improba/services/cms/interface';
import { relativeDay } from '@lib-improba/utils/date-format.utils';

export const columns = [
  {
    name: 'id',
    align: 'left',
    label: 'Id',
    sortable: true,
    field: (row: IPage) => row.id,
    format: (val: any) => val,
  },
  {
    name: 'name',
    align: 'left',
    label: 'Nom',
    sortable: true,
    field: (row: IPage) => row.name,
    format: (val: any) => val,
  },
  {
    name: 'type',
    align: 'left',
    label: 'Type',
    sortable: true,
    field: (row: IPage) => row.type,
    format: (val: any) => val,
  },
  {
    name: 'status',
    align: 'left',
    label: 'Status',
    sortable: true,
    field: (row: IPage) => row.status,
    format: (val: any) => val,
  },
  {
    name: 'actions',
    align: 'left',
    label: 'Actions',
  },
];
