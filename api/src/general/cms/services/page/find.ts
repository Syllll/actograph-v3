import {
  IConditions,
  IPaginationOptions,
  IPaginationOutput,
  OperatorEnum,
  TypeEnum,
} from '@utils/repositories/base.repositories';
import { Page, PageStatusEnum } from '../../entities/page.entity';
import { PageRepository } from '../../repositories/page.repository';
import { PageService } from './index.service';
import { NotFoundException } from '@nestjs/common';
import { BlocStatusEnum, BlocTypeEnum } from '../../entities/bloc.entity';

export class Find {
  private pageRepository: PageRepository;
  private pageService: PageService;

  constructor(options: {
    pageRepository: PageRepository;
    pageService: PageService;
  }) {
    this.pageRepository = options.pageRepository;
    this.pageService = options.pageService;
  }

  public async findAll(): Promise<Partial<Page>[]> {
    const pages = await this.pageRepository.find();
    return pages;
  }


  public async findFromUrl(url: string, options?: {
    relations?: string[];
  }): Promise<Page> {
    const page = await this.pageRepository.findOne({
      where: { url },
      relations: options?.relations,
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  public async findFromUrlWithContentAndLayout(url: string, admin?: boolean): Promise<Page> {

    const allProps = this.pageRepository.allProperties();
    const props: any = this.pageRepository.allPropertiesForSelect();
    props['content'] = {
      id: true,
      name: true,
      content: true,
      description: true,
    };
    props['layout'] = {
      id: true,
      name: true,
      content: true,
      description: true,
    };

    const page = await this.pageRepository.findOne({
      where: { url },
      relations: ['content', 'layout'],
      select: props,
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Check the access authorisation
    if (!admin) {
      if (page.status !== PageStatusEnum.PUBLISHED) {
        throw new NotFoundException('Page not found');
      }
    }

    return page;
  }

  public async findAndPaginateWithOptions(
    options: IPaginationOptions,
    filters: {
      search: string;
    },
  ): Promise<IPaginationOutput<Page>> {
    const relations = options.relations;
    const conditions = [] as IConditions[];

    if (filters.search) {
      conditions.push({
        type: TypeEnum.AND,
        key: 'name',
        operator: OperatorEnum.LIKE,
        value: filters.search,
        caseless: true,
      });
    }

    const pages = await this.pageRepository.findAndPaginate({
      ...options,
      relations,
      conditions,
    });

    return pages;
  }
}
