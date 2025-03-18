import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import {
  PaginationOptions,
  PaginationResponse,
} from '@lib-improba/utils/pagination.utils';
import { IUser } from '@services/users/user.interface';
import { IProtocol } from './interface';

const apiUrl = httpUtils.apiUrl();

export const protocolService = {
  async findWithPagination(
    options: PaginationOptions,
    search?: {
      searchString?: string;
    }
  ): Promise<PaginationResponse<IProtocol>> {
    const response = await api().get(
      `${apiUrl}/observations/protocols/paginate`,
      {
        params: {
          ...options,
          ...search,
        },
      }
    );

    return response.data;
  },
};
