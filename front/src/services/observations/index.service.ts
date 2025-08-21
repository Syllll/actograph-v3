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
    options?: {
      includes?: string[];
    }
  ): Promise<IObservation> => {
    const response = await api().get(`${apiUrl}/observations/${id}`, {
      params: {
        ...options,
      },
    });
    return response.data;
  },
  findAllForCurrentUser: async (): Promise<IObservation[]> => {
    const response = await api().get(`${apiUrl}/observations`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api().delete(`${apiUrl}/observations/${id}`);
  },
  cloneExampleObservation: async (): Promise<IObservation> => {
    const response = await api().post(`${apiUrl}/observations/clone-example`);
    return response.data;
  },
  create: async (options: {
    name: string;
    description?: string;
  }): Promise<IObservation> => {
    const response = await api().post(`${apiUrl}/observations`, {
      name: options.name,
      description: options.description,
    });
    return response.data;
  },
};
