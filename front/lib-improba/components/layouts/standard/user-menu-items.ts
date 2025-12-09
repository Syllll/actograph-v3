export const userMenuItems = (i18n: any, router: any, onAutosaveRestore?: () => void | Promise<void>) => {
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
    {
      name: 'license',
      label: 'Licence',
      route: { name: 'user_license' },
    },
    ...(onAutosaveRestore ? [{
      name: 'autosave',
      label: 'Sauvegardes automatiques',
      action: onAutosaveRestore,
    }] : []),
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
      action: undefined, // Will be handled in ToolbarContent
    },
  ];
};
