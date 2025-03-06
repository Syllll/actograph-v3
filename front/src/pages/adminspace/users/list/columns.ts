import { IUser } from '@services/users/user.interface';
import { relativeDay } from '@lib-improba/utils/date-format.utils';

export const columns = [
  {
    name: 'id',
    align: 'left',
    label: 'Id',
    sortable: true,
    field: (row: IUser) => row.id,
    format: (val: any) => val,
  },
  {
    name: 'username',
    align: 'left',
    label: 'Email',
    sortable: true,
    field: (row: IUser) => row.userJwt?.username,
    format: (val: any) => val,
  },
  {
    name: 'roles',
    align: 'left',
    label: 'Roles',
    sortable: true,
    field: (row: IUser) => row.roles,
    format: (val: string) => val,
    chips: [
      {
        value: 'admin',
        color: 'primary',
        textColor: 'white',
        label: 'Admin',
      },
      {
        value: 'user',
        color: 'secondary',
        textColor: 'white',
        label: 'User',
      },
    ],
  },
  {
    name: 'createDate',
    align: 'left',
    label: 'Create date',
    sortable: true,
    field: (row: IUser) => row.createdAt,
    format: (val: string) => relativeDay(val),
  },
];
