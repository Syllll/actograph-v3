export const userMenuItems = (i18n: any, auth: any) => {
  return [
    {
      name: 'theme',
      label: i18n.t('theme'),
      action: undefined,
    },
    {
      name: 'lang',
      label: i18n.t('lang'),
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
      label: () => i18n.t('layout.dropDownMenu.quit'),
      clickable: false,
      action: () => {
        auth.methods.logout();
      },
    },
  ];
};
