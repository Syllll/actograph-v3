import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import {
  PaginationOptions,
  PaginationResponse,
} from '@lib-improba/utils/pagination.utils';
import { IUser } from '@services/users/user.interface';
import { IReading, ReadingTypeEnum } from './interface';

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
  async createMany(
    options: {
      observationId: number,
      readings: {
        name: string;
        description?: string;
        type: ReadingTypeEnum;
        dateTime: Date;
      }[],
    }
  ) {
    const response = await api().post(`${apiUrl}/observations/readings`, {
      ...options,
    });

    return response.data;
  },

  async updateMany(
    options: {
      observationId: number,
      readings: {
        id: number;
        name: string;
        description?: string;
        type: ReadingTypeEnum;
        dateTime: Date;
      }[],
    }
  ) {
    const response = await api().patch(`${apiUrl}/observations/readings`, {
      ...options,
    });

    return response.data;
  },

  async deleteMany(
    options: {
      observationId: number,
      ids: number[],
    }
  ) {
    const response = await api().post(`${apiUrl}/observations/readings/delete`, {
      ...options,
    });

    return response.data;
  },
};
