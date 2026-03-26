import type { ComposerTranslation } from 'vue-i18n';
import type { Router } from 'vue-router';

export function buildAdminDrawerMenu(t: ComposerTranslation, router: Router) {
  return [
    {
      label: t('adminUsers.menuUsers'),
      action: () => {
        router.push({
          name: 'admin_users_list',
        });
      },
    },
  ];
}
