export const userMenuItems = (i18n: any, auth: any) => {
  return [
    {
      name: 'theme',
      label: 'Thème',
      action: undefined,
    },
    {
      name: 'lang',
      label: 'Langue',
      class: 'q-pa-none',
      action: undefined,
    },
    /*{
    label: i18n.t('layout.dropDownMenu.profile'),
    disable: true,
    action: () => {
      router.push(routeFromRole({ name: 'account_profil' }));
    },
  },
  {
    label: i18n.t('layout.dropDownMenu.info'),
    disable: true,
    action: () => {
      router.push(routeFromRole({ name: 'account_info' }));
    },
  },*/
    {
      name: 'quit',
      label: 'Quitter',
      clickable: false,
      action: () => {
        auth.methods.logout();
      },
    },
  ];
};
