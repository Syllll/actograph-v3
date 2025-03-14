import { useQueryParams } from 'src/../lib-improba/composables/use-query-params';
import { useTheme } from 'src/../lib-improba/composables/use-theme';
import { useAuth } from 'src/../lib-improba/composables/use-auth';
import { QVueGlobals } from 'quasar';
import { Router } from 'vue-router';

// Init improba composables that need to be initialized at the start of the app
export const useImprobaInit = async (quasar: QVueGlobals, router: Router) => {
  // Init query params store
  const qp = useQueryParams(router);
  await qp.methods.initRouteQuery();
  
  // If electron
  if (process.env.MODE === 'electron') {
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
