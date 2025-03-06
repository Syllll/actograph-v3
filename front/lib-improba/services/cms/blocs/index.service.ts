import httpUtils from '@services/utils/http.utils';
import { api } from 'src/../lib-improba/boot/axios';
import { IPage, PageStatusEnum, PageTypeEnum } from '../interface';
import { PaginationResponse } from '@lib-improba/utils/pagination.utils';
import { IBloc } from '../interface';

export const blocService = {
  async findForTypeAndName(options: {
    type: string;
    name: string;
  }): Promise<IBloc> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().get(`${apiUrl}/cms/blocs`, {
      params: {
        type: options.type,
        name: options.name,
      },
    });
    return response.data;
  },

  async findOneWithContent(options: { id: number }): Promise<IBloc> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().get(`${apiUrl}/cms/blocs/${options.id}`);
    return response.data;
  },

  async updateBlocContent(options: {
    id: number;
    content: string;
  }): Promise<IBloc> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().patch(
      `${apiUrl}/cms/blocs/${options.id}/content`,
      {
        content: options.content,
      }
    );
    return response.data;
  },
};
