import httpUtils from '@services/utils/http.utils';
import { api } from 'src/../lib-improba/boot/axios';
import {
  IPage,
  PageStatusEnum,
  PageTypeEnum,
  IBloc,
  BlocStatusEnum,
  BlocTypeEnum,
} from '../../interface';
import { PaginationResponse } from '@lib-improba/utils/pagination.utils';

export const adminBlocService = {
  async updateContent(options: { id: number; content: any }): Promise<IBloc> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().patch(`${apiUrl}/cms/blocs-admin/content`, {
      id: options.id,
      content: options.content,
    });
    return response.data;
  },

  async findWithPagination(
    paginationOptions: {
      limit: number;
      offset: number;
      orderBy: string;
      order: 'ASC' | 'DESC';
      includes?: string[];
    },
    filterOptions?: {
      searchString?: string;
      type?: string;
      status?: string;
    }
  ): Promise<PaginationResponse<IBloc>> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().get(`${apiUrl}/cms/blocs-admin/paginate`, {
      params: {
        ...paginationOptions,
        ...filterOptions,
      },
    });
    return response.data;
  },

  async create(options: {
    name: string;
    description?: string;
    type?: BlocTypeEnum;
    status?: BlocStatusEnum;
  }): Promise<IPage> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().post(`${apiUrl}/cms/blocs-admin`, options);
    return response.data;
  },
};
