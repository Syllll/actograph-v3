import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '../utils/http.utils';

export default {
  async login(login: string, password: string): Promise<any> {
    const apiUrl = httpUtils.apiUrl();

    const input = {
      username: login,
      password: password,
    };

    const response = await api().post('/auth-jwt/login', input);

    return response.data;
  },

  async refreshToken(token: string) {
    const response = await api().post('/auth-jwt/refreshToken', {
      token,
    });

    return response.data;
  },

  logout() {
    const apiUrl = httpUtils.apiUrl();
    window.location.href = `${apiUrl}`;
  },

  async create(username: string, password: string) {
    const input = {
      username,
      password,
    };
    const response = await api().post('/auth-jwt/register', input);

    return response.data;
  },

  async forgotPassword(username: string) {
    const resetPasswordUrl = `${window.location.origin}/#/auth/resetPwd`;

    const response = await api().post('/auth-jwt/password-forgot', {
      username,
      resetPasswordUrl,
    });

    return response.data;
  },

  async resetPassword(token: string, password: string) {
    const response = await api().post('/auth-jwt/recuperation', {
      token,
      password,
    });

    return response.data;
  },
};
