import httpUtils from '@services/utils/http.utils';
import { api } from 'src/../lib-improba/boot/axios';
import { IPage, PageStatusEnum, PageTypeEnum } from '../interface';
import { PaginationResponse } from '@lib-improba/utils/pagination.utils';

export const pageService = {
  async findWithContentAndLayout(options: { pageUrl: string }): Promise<IPage> {
    const apiUrl = httpUtils.apiUrl();
    const response = await api().get(
      `${apiUrl}/cms/pages/with-content-and-layout/${options.pageUrl}`,
      {
        params: {},
      }
    );
    return response.data;
  },
};
