import { IUser } from '@services/users/user.interface';
import { relativeDay } from '@lib-improba/utils/date-format.utils';
import type { ComposerTranslation } from 'vue-i18n';

export function createAdminUserColumns(t: ComposerTranslation) {
  return [
    {
      name: 'id',
      align: 'left',
      label: t('adminUsers.colId'),
      sortable: true,
      field: (row: IUser) => row.id,
      format: (val: unknown) => val,
    },
    {
      name: 'username',
      align: 'left',
      label: t('adminUsers.colEmail'),
      sortable: true,
      field: (row: IUser) => row.userJwt?.username,
      format: (val: unknown) => val,
    },
    {
      name: 'roles',
      align: 'left',
      label: t('adminUsers.colRoles'),
      sortable: true,
      field: (row: IUser) => row.roles,
      format: (val: string) => val,
      chips: [
        {
          value: 'admin',
          color: 'primary',
          textColor: 'white',
          label: t('adminUsers.roleAdmin'),
        },
        {
          value: 'user',
          color: 'secondary',
          textColor: 'white',
          label: t('adminUsers.roleUser'),
        },
      ],
    },
    {
      name: 'createDate',
      align: 'left',
      label: t('adminUsers.colCreateDate'),
      sortable: true,
      field: (row: IUser) => row.createdAt,
      format: (val: string) => relativeDay(val),
    },
  ];
}
