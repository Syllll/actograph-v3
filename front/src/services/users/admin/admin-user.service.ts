import httpUtils from '../../utils/http.utils';
import {
  PaginationOptions,
  PaginationResponse,
} from '@services/utils/pagination.utils';
import { api } from 'src/../lib-improba/boot/axios';
import { IUser } from '../user.interface';

export const adminUserService = {
  async findWithPagination(
    options: PaginationOptions,
    search?: {
      searchString?: string;
      filterRoles?: string[];
    }
  ): Promise<PaginationResponse<IUser>> {
    const apiUrl = httpUtils.apiUrl();

    const response = await api().get(`${apiUrl}/users-admin/paginate`, {
      params: {
        ...options,
        ...search,
      },
    });

    return response.data;
  },
  async create(options: {
    username: string;
    password: string;
    roles: string[];
  }): Promise<IUser> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().post(`${apiUrl}/users-admin`, {
      userJwt: {
        username: options.username,
        password: options.password,
      },
      roles: options.roles,
    });

    return response.data;
  },
};
