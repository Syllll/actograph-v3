import { api } from 'src/../lib-improba/boot/axios';

const urlsThatDoNotTriggerLoginRefresh: string[] = [
  '/refreshToken',
  '/current',
  '/login',
  '/users/current',
];

const urlsThatDoNotTriggerLogoutWhenError: string[] = ['/users/current'];

function isInsideUrls(url: string, urls: string[]) {
  for (const shouldNotTriggerUrl of urls) {
    if (url.endsWith(shouldNotTriggerUrl)) return true;
  }
  return false;
}

// Garde-fou contre les boucles de rafraîchissement : un seul refresh à la fois
// pour éviter de lancer plusieurs attemptLogin en parallèle sur des 401 multiples.
let isRefreshing = false;

async function tryToRefreshLoginToken(user: any, auth: any) {
  const loginRefreshTime = 1000 * 60 * 30; // 30 min

  const lastLoginDate = new Date(user.loginDate);
  // console.log(new Date().getTime() - lastLoginDate.getTime())
  if (new Date().getTime() - lastLoginDate.getTime() >= loginRefreshTime) {
    // Silencieux : un échec transitoire (backend brièvement occupé) ne doit pas
    // déconnecter l'utilisateur. L'intercepteur 401 gérera la déconnexion si une
    // vraie requête authentifiée échoue ensuite.
    try {
      await auth.methods.attemptLogin(false, { silent: true });
    } catch (err: any) {
      console.warn('Proactive token refresh failed:', err);
    }
  }
}

export const init = async (auth: { methods: any; sharedState: any }) => {
  // Try to login in cas the user is coming back on the app after closing
  // it it fails then it is normal, the user will have to login again,
  // hence the warning.
  try {
    await auth.methods.attemptLogin(true);
  } catch (err: any) {
    const warning = `use-auth/axios: ${err.message ?? err}`;
    console.warn(warning);
  }

  const axiosInstance = api();

  axiosInstance.interceptors.request.use(
    async (request: any) => {
      // IMPORTANT: Always ensure token is in headers before each request
      // This handles cases where the token exists in localStorage but wasn't
      // properly set in axios headers (e.g., after page reload, navigation, etc.)
      const tokenFromStorage = localStorage.getItem('token');
      if (tokenFromStorage && !request.headers.Authorization) {
        request.headers.Authorization = 'Bearer ' + tokenFromStorage;
        // Also update defaults for future requests
        axiosInstance.defaults.headers.common.Authorization = 'Bearer ' + tokenFromStorage;
      }

      const user = auth.sharedState.user;
      const token = auth.sharedState.token || localStorage.getItem('token');
      // console.log(request.url)
      if (
        user &&
        token &&
        user.loginDate &&
        request.method !== 'OPTIONS' &&
        request.url &&
        !isInsideUrls(request.url, urlsThatDoNotTriggerLoginRefresh)
      ) {
        await tryToRefreshLoginToken(user, auth);
        // After refresh, ensure the token is still in headers
        const refreshedToken = localStorage.getItem('token');
        if (refreshedToken) {
          request.headers.Authorization = 'Bearer ' + refreshedToken;
        }
      }

      return request;
    },
    (error: any) => {
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response: any) => {
      return response;
    },
    async (error: any) => {
      const requestUrl =
        error?.config?.url || error?.request?.responseURL || '';
      const isAuthUrl =
        isInsideUrls(requestUrl, urlsThatDoNotTriggerLogoutWhenError) ||
        isInsideUrls(requestUrl, urlsThatDoNotTriggerLoginRefresh);
      const is401 = error?.response?.status === 401;

      // Sur 401, on tente une fois de rafraîchir la session avant d'abandonner.
      // Évite la boucle si la requête déjà échouée est elle-même un appel d'auth
      // ou a déjà été réessayée.
      if (
        is401 &&
        !isAuthUrl &&
        error?.config &&
        !error.config._retriedAfterRefresh &&
        !isRefreshing
      ) {
        error.config._retriedAfterRefresh = true;
        isRefreshing = true;
        try {
          await auth.methods.attemptLogin(true);
          const refreshedToken = localStorage.getItem('token');
          if (refreshedToken) {
            error.config.headers = error.config.headers || {};
            error.config.headers.Authorization = 'Bearer ' + refreshedToken;
          }
          isRefreshing = false;
          return axiosInstance.request(error.config);
        } catch (refreshError: any) {
          isRefreshing = false;
          auth.methods.logout();
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );
};
