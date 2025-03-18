import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import {
  PaginationOptions,
  PaginationResponse,
} from '@lib-improba/utils/pagination.utils';
import { IUser } from '@services/users/user.interface';
import { IObservation } from './interface';

const apiUrl = httpUtils.apiUrl();

export const observationService = {
  async findWithPagination(
    options: PaginationOptions,
    search?: {
      searchString?: string;
    }
  ): Promise<PaginationResponse<IObservation>> {
    const response = await api().get(`${apiUrl}/observations/paginate`, {
      params: {
        ...options,
        ...search,
      },
    });

    return response.data;
  },
  findOne: async (
    id: number,
    options: {
      includes?: string[];
    }
  ): Promise<IObservation> => {
    const response = await api().get(`${apiUrl}/observations/${id}`);
    return response.data;
  },
  findAllForCurrentUser: async (): Promise<IObservation[]> => {
    const response = await api().get(`${apiUrl}/observations`);
    return response.data;
  },
};
