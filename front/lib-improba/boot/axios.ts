import axios, { AxiosInstance } from 'axios';
import httpUtils from '@services/utils/http.utils';
import { getCurrentInstance, App } from 'vue';

let apiSingleton = null as any; // singleton

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

export const boot = (options?: { app?: App<any> }) => {
  const apiUrl = httpUtils.apiUrl();

  // Be careful when using SSR for cross-request state pollution
  // due to creating a Singleton instance here;
  // If any client changes this (global) instance, it might be a
  // good idea to move this instance creation inside of the
  // "export default () => {}" function below (which runs individually
  // for each client)
  // console.log('boot/axios: apiUrl', apiUrl);
  if (!apiSingleton) {
    apiSingleton = axios.create({
      baseURL: apiUrl,
      paramsSerializer(params) {
        const searchParams = new URLSearchParams();
        // Loop on each query param
        for (const key of Object.keys(params)) {
          // Query param and its value
          const param = params[key];
          // If the query param is an array then we need to transform it from:
          // [1,2,3] -> '1,2,3'
          if (Array.isArray(param)) {
            let arrayAsStr = '';
            // Loop on each entry in the array to put it into the str
            for (const p of param) {
              if (arrayAsStr.length > 0) {
                arrayAsStr += ',';
              }
              arrayAsStr += `${p}`;
            }
            searchParams.append(key, arrayAsStr);
          } else if (param !== undefined) {
            searchParams.append(key, param);
          }
        }
        return searchParams.toString();
      },
    });
    //apiSingleton.defaults.headers.common['RandomId'] = Math.random().toString(36).substring(7);
    // for use inside Vue files (Options API) through this.$axios and this.$api
    /* if (options?.app) {
      options.app.config.globalProperties.$axios = axios;
      // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
      //       so you won't necessarily have to import axios in each vue file

      options.app.config.globalProperties.$api = api;
      // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
      //       so you can easily perform requests against your app's API
    } */
  }

  return apiSingleton;
};

export const api = () => {
  const _api = boot();
  if (!_api) {
    throw new Error('boot/axios: api not initialized');
  }

  return _api;
};
