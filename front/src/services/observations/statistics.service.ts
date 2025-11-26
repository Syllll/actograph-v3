import { api } from 'src/../lib-improba/boot/axios';
import httpUtils from '@services/utils/http.utils';
import {
  IGeneralStatistics,
  ICategoryStatistics,
  IConditionalStatistics,
  IConditionalStatisticsRequest,
} from './statistics.interface';

const apiUrl = httpUtils.apiUrl();

export const statisticsService = {
  /**
   * Get general statistics for an observation
   */
  async getGeneralStatistics(
    observationId: number,
  ): Promise<IGeneralStatistics> {
    const response = await api().get(
      `${apiUrl}/observations/${observationId}/statistics/general`,
    );
    return response.data;
  },

  /**
   * Get statistics for a specific category
   */
  async getCategoryStatistics(
    observationId: number,
    categoryId: string,
  ): Promise<ICategoryStatistics> {
    const response = await api().get(
      `${apiUrl}/observations/${observationId}/statistics/category/${categoryId}`,
    );
    return response.data;
  },

  /**
   * Get conditional statistics
   */
  async getConditionalStatistics(
    observationId: number,
    request: IConditionalStatisticsRequest,
  ): Promise<IConditionalStatistics> {
    const response = await api().post(
      `${apiUrl}/observations/${observationId}/statistics/conditional`,
      request,
    );
    return response.data;
  },
};

