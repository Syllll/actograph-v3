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

async function tryToRefreshLoginToken(user: any, auth: any) {
  const loginRefreshTime = 1000 * 60 * 30; // 30 min

  const lastLoginDate = new Date(user.loginDate);
  // console.log(new Date().getTime() - lastLoginDate.getTime())
  if (new Date().getTime() - lastLoginDate.getTime() >= loginRefreshTime) {
    try {
      await auth.methods.attemptLogin();
    } catch (err: any) {
      console.warn(err);
      auth.methods.logout();
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
      // console.log(request.url)
      if (
        user &&
        user.token &&
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
      // console.log(store.state.auth.user)
      // console.log(response)
      return response;
    },
    (error: any) => {
      const triggerLogout = !isInsideUrls(
        error.request.responseURL,
        urlsThatDoNotTriggerLogoutWhenError
      );

      if (triggerLogout && error.response && error.response.status === 401) {
        // auth.methods.logout();
      }

      return Promise.reject(error);
    }
  );
};
