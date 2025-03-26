import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import {
  PaginationOptions,
  PaginationResponse,
} from '@lib-improba/utils/pagination.utils';
import { IUser } from '@services/users/user.interface';
import { IReading } from './interface';

const apiUrl = httpUtils.apiUrl();

export const readingService = {
  async findWithPagination(
    options: PaginationOptions,
    search?: {
      searchString?: string;
      observationId?: number;
    }
  ): Promise<PaginationResponse<IReading>> {
    const response = await api().get(
      `${apiUrl}/observations/readings/paginate`,
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
