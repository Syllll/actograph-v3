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

    Cookies.remove(`${process.env.APP_NAME}`, cookieOptions);
  };

  const methods = {
    async attemptLogin(throwError = false) {
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
        } else {
          throw new Error('No token found in localStorage or cookies');
        }
      } catch (err) {
        if (throwError) {
          throw err;
        }

        removeCurrentUser();
        console.error(err);
      }
    },
    async login(login: string, password: string) {
      const userLogin = await authService.login(login, password);

      setCookiesWithToken(userLogin.token);

      await getAndSetCurrentUser();

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
    },
  };

  return {
    sharedState,
    methods,
  };
};
