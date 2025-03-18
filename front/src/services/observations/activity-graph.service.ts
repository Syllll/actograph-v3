import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import {
  PaginationOptions,
  PaginationResponse,
} from '@lib-improba/utils/pagination.utils';
import { IUser } from '@services/users/user.interface';
import { IActivityGraph } from './interface';

const apiUrl = httpUtils.apiUrl();

export const activityGraphService = {
  async findWithPagination(
    options: PaginationOptions,
    search?: {
      searchString?: string;
    }
  ): Promise<PaginationResponse<IActivityGraph>> {
    const response = await api().get(
      `${apiUrl}/observations/activity-graph/paginate`,
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
