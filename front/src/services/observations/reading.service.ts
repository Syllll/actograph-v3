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
        dateTime: Date | string;
      }[],
    }
  ) {
    // Convert Date objects to ISO strings for backend validation (@IsDateString())
    const readings = options.readings.map((reading) => ({
      ...reading,
      dateTime: reading.dateTime instanceof Date 
        ? reading.dateTime.toISOString() 
        : reading.dateTime,
    }));

    const response = await api().post(`${apiUrl}/observations/readings`, {
      observationId: options.observationId,
      readings,
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
        dateTime: Date | string;
        tempId?: string | null;
      }[],
    }
  ) {
    // Convert Date objects to ISO strings for backend validation (@IsDateString())
    const readings = options.readings.map((reading) => ({
      id: reading.id,
      name: reading.name,
      description: reading.description,
      type: reading.type,
      dateTime: reading.dateTime instanceof Date 
        ? reading.dateTime.toISOString() 
        : reading.dateTime,
      ...(reading.tempId !== undefined && reading.tempId !== null ? { tempId: reading.tempId } : {}),
    }));

    const payload = {
      observationId: options.observationId,
      readings,
    };

    console.debug('[readingService.updateMany] Sending payload:', JSON.stringify(payload, null, 2));

    const response = await api().patch(`${apiUrl}/observations/readings`, payload);

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
