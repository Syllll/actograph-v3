export const userMenuItems = (i18n: any, router: any, onAutosaveRestore?: () => void | Promise<void>) => {
  const t = i18n.t.bind(i18n);
  return [
    {
      name: 'theme',
      label: t('layout.menuTheme'),
      action: undefined,
    },
    {
      name: 'lang',
      label: t('layout.menuLang'),
      class: 'q-pa-none',
      action: undefined,
    },
    {
      name: 'license',
      label: t('layout.menuLicense'),
      route: { name: 'user_license' },
    },
    ...(onAutosaveRestore ? [{
      name: 'autosave',
      label: t('layout.menuAutosave'),
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
      label: t('layout.menuQuit'),
      clickable: false,
      action: undefined, // Will be handled in ToolbarContent
    },
  ];
};
