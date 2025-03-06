import httpUtils from '@services/utils/http.utils';
import { api } from 'src/../lib-improba/boot/axios';
import { IPage, PageStatusEnum, PageTypeEnum } from '../../interface';
import { PaginationResponse } from '@lib-improba/utils/pagination.utils';

export const adminPageService = {
  async findAll(): Promise<PaginationResponse<IPage>> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().get(`${apiUrl}/cms/admin-pages`);
    return response.data;
  },

  async findOne(
    id: number,
    options?: {
      relations?: string[];
    }
  ): Promise<IPage> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().get(`${apiUrl}/cms/pages-admin/${id}`, {
      params: {
        includes: options?.relations,
      },
    });
    return response.data;
  },

  async create(options: {
    name: string;
    url: string;
    description?: string;
    type?: PageTypeEnum;
    status?: PageStatusEnum;
  }): Promise<IPage> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().post(`${apiUrl}/cms/pages-admin`, options);
    return response.data;
  },

  async update(options: {
    id: number;
    name?: string;
    status?: PageStatusEnum;
    descriptions?: string;
    layout?: {
      id: number;
    } | null;
  }): Promise<IPage> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().patch(`${apiUrl}/cms/pages-admin`, options);
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
    }
  ): Promise<PaginationResponse<IPage>> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().get(`${apiUrl}/cms/pages-admin/paginate`, {
      params: {
        ...paginationOptions,
        ...filterOptions,
      },
    });
    return response.data;
  },

  async findWithContentAndLayout(options: { pageUrl: string }): Promise<IPage> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().get(
      `${apiUrl}/cms/pages-admin/with-content-and-layout/${options.pageUrl}`,
      {
        params: {},
      }
    );
    return response.data;
  },

  async remove(options: { id: number }): Promise<IPage> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().delete(
      `${apiUrl}/cms/pages-admin/${options.id}`
    );

    return response.data;
  },
};
