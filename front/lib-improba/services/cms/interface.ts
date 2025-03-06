import { IUser } from '@services/users/user.interface';

export enum PageTypeEnum {
  PAGE = 'page',
}

export enum PageStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum BlocTypeEnum {
  PAGE_CONTENT = 'page-body',
  PAGE_LAYOUT = 'layout',
  OTHERS = 'others',
}

export enum BlocStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export interface IBloc {
  id: number;
  name: string;
  description?: string;
  status: BlocStatusEnum;
  type: BlocTypeEnum;
  content?: any;
  createdBy?: IUser;
  lastModififiedBy?: IUser;
  page?: IPage;
}

export interface IPage {
  id: number;
  name: string;
  url: string;
  description?: string;
  status: PageStatusEnum;
  type: PageTypeEnum;
  createdBy?: IUser;
  content?: IBloc;
  layout?: IBloc;
}
