import { api } from 'src/../lib-improba/boot/axios';
import { IUser } from './user.interface';
import httpUtils from '../utils/http.utils';

export const UserService = {
  async getCurrentUser() {
    const apiUrl = httpUtils.apiUrl();

    const response = await api().get(`${apiUrl}/users/current`);

    return response.data;
  },

  async registerUser(
    username: string,
    password: string,
    roles: string[]
  ): Promise<any> {
    const apiUrl = httpUtils.apiUrl();

    const response = await api().get(`${apiUrl}/users/register`);

    return response.data;
  },

  async create(
    username: string,
    password: string,
    roles: string[]
  ): Promise<IUser> {
    const input = {
      roles,
      userJwt: {
        username,
        password,
      },
    };
    const apiUrl = httpUtils.apiUrl();

    const response = await api().post(`${apiUrl}/users`, input);

    return response.data;
  },

  async updateCurrentUser(user: {
    firstname?: string;
    lastname?: string;
    preferDarkTheme?: boolean;
  }) {
    const apiUrl = httpUtils.apiUrl();

    const response = await api().patch(`${apiUrl}/users/current`, user);

    return response.data;
  },

  async choosePasswordAfterReset(password: string) {
    const apiUrl = httpUtils.apiUrl();

    const response = await api().patch(
      `${apiUrl}/users/choosePasswordAfterReset`,
      {
        password,
      }
    );

    return response.data;
  },
};
