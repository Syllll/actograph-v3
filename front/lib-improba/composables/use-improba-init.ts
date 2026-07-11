import { useQueryParams } from 'src/../lib-improba/composables/use-query-params';
import { useTheme } from 'src/../lib-improba/composables/use-theme';
import { useAuth } from 'src/../lib-improba/composables/use-auth';
import { QVueGlobals } from 'quasar';
import { Router } from 'vue-router';

// Une fenêtre pop-out (vidéo / boutons) est ouverte via window.open sur une URL
// en hash mode `#/popup/<component>?observationId=...`. Elle partage le même SPA
// et donc le même boot : il faut préserver son hash au lieu de le rediriger vers
// le gateway comme la fenêtre principale.
const isPopupWindow = (): boolean =>
  typeof window !== 'undefined' &&
  !!window.location &&
  window.location.hash.startsWith('#/popup/');

// Init improba composables that need to be initialized at the start of the app
export const useImprobaInit = async (quasar: QVueGlobals, router: Router) => {
  const popup = isPopupWindow();

  // Init query params store.
  // initRouteQuery() fait un Router.replace({ path: window.location.pathname, query }),
  // ce qui écrase le hash `#/popup/...` d'une fenêtre pop-out et la renvoie sur la
  // route par défaut. On l'escale pour les pop-out (serverPort est lu directement
  // depuis window.location.search par http.utils, le pop-out n'a pas besoin du store).
  const qp = useQueryParams(router);
  if (!popup) {
    await qp.methods.initRouteQuery();
  }

  // If electron
  // targetRoute=/gateway est injecté par electron-main.ts au démarrage de la
  // fenêtre principale et fuite dans la search string des fenêtres pop-out
  // (window.open hérite de l'URL courante). Sans ce garde, le pop-out serait
  // redirigé vers /gateway -> user -> accueil au lieu d'afficher #/popup/...
  if (process.env.MODE === 'electron' && !popup) {
    // Get the url param named targetRoute
    const url = new URL(window.location.href);
    const targetRoute = url.searchParams.get('targetRoute');
    if (targetRoute) {
      router.replace(targetRoute);
    }
  }

  // Init theme
  const theme = useTheme(quasar);
  const isDark = process.env.DEFAULT_COLOR_MODE === 'dark';
  theme.methods.setTheme(isDark, false);

  // Auth init
  const auth = useAuth(router);
  await auth.methods.init();
};
