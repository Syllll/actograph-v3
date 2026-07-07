import { reactive } from 'vue';
import { Cookies } from 'quasar';
import { api } from 'src/../lib-improba/boot/axios';
import { Router, useRouter } from 'vue-router';
import authService from '@services/users/auth.service';
import { UserService } from '@services/users/user.service';
import httpUtils from '@services/utils/http.utils';
import { init as initAxios } from './axios';
import { init as initRouter } from './router';

const cookieOptions = {
  expires: 30, // 30 days
  path: '/',
  sameSite: <any>'Lax',
};

const sharedState = reactive({
  user: null as null | any,
  loginDate: null as null | Date,
  token: null as null | string,
});

// Timer de rafraîchissement proactif du jeton. Le refresh se fait aussi à la
// première requête (intercepteur axios), mais un timer garantit le renouvellement
// avant expiration même si l'utilisateur reste inactif (ex. app ouverte 3h sans
// interaction). Durée < durée de vie du token (1h) pour rester dans la fenêtre
// valide ; ici 25 min.
const REFRESH_INTERVAL_MS = 1000 * 60 * 25;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let isRefreshingSession = false;

function getTokenFromCookiesAndSaveIntoAxios() {
  const tokenFromCookie = localStorage.getItem('token');
  if (tokenFromCookie)
    api().defaults.headers.common.Authorization = 'Bearer ' + tokenFromCookie;

  return tokenFromCookie;
}

function setCookiesWithToken(token: string) {
  localStorage.setItem('token', token);

  getTokenFromCookiesAndSaveIntoAxios();
}

export const useAuth = (router: Router) => {
  const getAndSetCurrentUser = async () => {
    const user = await UserService.getCurrentUser();
    sharedState.loginDate = new Date();
    sharedState.user = user;
  };

  const removeCurrentUser = () => {
    sharedState.user = null;
    sharedState.token = null;
    sharedState.loginDate = null;

    // Le token est stocké dans localStorage : il faut le retirer pour éviter
    // qu'un token expiré soit réinjecté à chaque requête par l'intercepteur.
    localStorage.removeItem('token');

    Cookies.remove(`${process.env.APP_NAME}`, cookieOptions);

    stopRefreshTimer();
  };

  const methods = {
    async attemptLogin(throwError = false, options?: { silent?: boolean }) {
      const silent = options?.silent === true;
      try {
        // First, try to get token from localStorage (fallback if cookies are not available)
        let currentToken = getTokenFromCookiesAndSaveIntoAxios();
        
        // If no token in localStorage, check cookies
        if (!currentToken && Cookies.has(`${process.env.APP_NAME}`)) {
          // Try to get token from cookies (legacy support)
          const cookieToken = Cookies.get(`${process.env.APP_NAME}`);
          if (cookieToken) {
            currentToken = cookieToken;
            setCookiesWithToken(cookieToken);
          }
        }

        if (currentToken) {
          const { token } = await authService.refreshToken(
            <string>currentToken
          );
          setCookiesWithToken(token);

          sharedState.token = token;
          await getAndSetCurrentUser();
          startRefreshTimer();
        } else {
          throw new Error('No token found in localStorage or cookies');
        }
      } catch (err) {
        if (throwError) {
          throw err;
        }

        // En mode silencieux (timer proactif / refresh déclenché par une
        // requête), on ne déconnecte pas l'utilisateur sur un échec transitoire
        // (backend brièvement occupé, socket morte). La véritable déconnexion
        // sera gérée par l'intercepteur 401 si une requête authentifiée échoue.
        if (silent) {
          console.warn('Silent session refresh failed:', err);
        } else {
          removeCurrentUser();
          console.error(err);
        }
      }
    },
    async login(login: string, password: string) {
      const userLogin = await authService.login(login, password);

      setCookiesWithToken(userLogin.token);

      await getAndSetCurrentUser();
      startRefreshTimer();

      router.push('/');
    },
    logout() {
      removeCurrentUser();
      router.push({ name: 'home' });
    },
    async create(username: string, password: string) {
      const input = {
        username,
        password,
      };
      const apiUrl = httpUtils.apiUrl();

      const response = await api().post(`${apiUrl}/auth-jwt/register`, input);

      return response.data;
    },
    init: async () => {
      await methods.attemptLogin(false);
      initRouter(router, { sharedState, methods });
      await initAxios({ sharedState, methods });
      // Le timer est démarré dans attemptLogin quand une session est active.
      // On le (re)garde aussi ici au cas où l'init axios aurait réinitialisé
      // l'état ; inactif si aucune session.
      startRefreshTimer();
    },
  };

  // Rafraîchissement best-effort déclenché par le timer périodique. Ne déclenche
  // pas de logout sur échec transitoire (mode silencieux) : l'intercepteur 401
  // axios s'occupe de la déconnexion si une vraie requête authentifiée échoue.
  async function refreshSession() {
    if (!sharedState.user || !localStorage.getItem('token')) {
      return;
    }
    if (isRefreshingSession) {
      return;
    }
    isRefreshingSession = true;
    try {
      await methods.attemptLogin(false, { silent: true });
    } finally {
      isRefreshingSession = false;
    }
  }

  function startRefreshTimer() {
    if (refreshTimer) {
      return;
    }
    refreshTimer = setInterval(() => {
      void refreshSession();
    }, REFRESH_INTERVAL_MS);
  }

  function stopRefreshTimer() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  return {
    sharedState,
    methods,
  };
};
