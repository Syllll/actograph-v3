import { Router } from 'vue-router';
import type { ComposerTranslation } from 'vue-i18n';

export const menu = (router: Router, t: ComposerTranslation) => [
  {
    label: t('chronicle.home'),
    icon: 'home',
    separator: false,
    action: () => router.push({ name: 'user_home' }),
    isActive: () => router.currentRoute.value.name === 'user_home',
  },
];
