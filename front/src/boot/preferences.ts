import { boot } from 'quasar/wrappers';
import { loadPreferences } from '@utils/preferences.utils';

export default boot(({ app }) => {
  const prefs = loadPreferences();

  // Apply locale
  const i18n = app.config.globalProperties.$i18n_ as
    | { global: { locale: { value: string } } }
    | undefined;
  if (i18n?.global?.locale && prefs.locale) {
    i18n.global.locale.value = prefs.locale;
  }

  // Apply dark mode
  const $q = app.config.globalProperties.$q as
    | { dark: { set: (value: boolean) => void } }
    | undefined;
  if ($q?.dark) {
    $q.dark.set(prefs.darkMode);
  }
});
