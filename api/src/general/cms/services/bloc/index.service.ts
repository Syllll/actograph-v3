import { Injectable, NotFoundException } from "@nestjs/common";
import { BaseService } from "@utils/services/base.service";
import { Bloc, BlocStatusEnum, BlocTypeEnum } from "../../entities/bloc.entity";
import { BlocRepository } from "../../repositories/bloc.repository";
import { layoutContentDefault, pageContentDefault } from "./content-default";
import { IPaginationOptions, IPaginationOutput, IConditions, TypeEnum, OperatorEnum } from "@utils/repositories/base.repositories";
import { PageStatusEnum, PageTypeEnum } from "../../entities/page.entity";
import { Create } from "./create";

@Injectable()
export class BlocService extends BaseService<Bloc, BlocRepository> {
  public create: Create;

  constructor(
    private readonly blocRepository: BlocRepository
  ) {
    super(blocRepository);

    this.create = new Create({
      blocRepository,
      blocService: this,
    });
  }

  public async createDefaultBlocsForPage(options: {
    pageId: number,
  }): Promise<Bloc[]> {
    let output = [] as Bloc[];

    // Create the PAGE_CONTENT bloc
    const pageContentBloc = this.blocRepository.create({
      type: BlocTypeEnum.PAGE_CONTENT,
      status: BlocStatusEnum.DRAFT,
      name: 'Default',
      page: {
        id: options.pageId
      },
      content: pageContentDefault,
    });
    const savedPageContentBloc = await this.blocRepository.save(pageContentBloc);
    output.push(savedPageContentBloc);

    return output;
  }

  public async findOneWithContent(options: {
    id: number
  }): Promise<Bloc> {
    const bloc = await this.blocRepository.findOneFromId(options.id, {
      select: this.blocRepository.allPropertiesForSelect(),
    });
    if (!bloc) {
      throw new NotFoundException('Bloc not found');
    }

    return bloc;
  }

  public async findForTypeAndName(options: {
    type: string,
    name: string,
  }): Promise<Bloc> {
    const bloc = await this.blocRepository.findOne({
      where: {
        type: <BlocTypeEnum>options.type,
        name: options.name,
      },
      select: this.blocRepository.allPropertiesForSelect(),
    });

    if (!bloc) {
      throw new NotFoundException('Bloc was not found');
    }

    return bloc;
  }

  public async updateContent(options: {
    id: number,
    content: object,
  }): Promise<Bloc> {
    const bloc = await this.blocRepository.findOneFromId(options.id);
    if (!bloc) {
      throw new NotFoundException('Bloc not found');
    }

    bloc.content = options.content;
    const savedBloc = await this.blocRepository.save(bloc);

    return savedBloc;
  }

  public async createDefaultLayout(): Promise<Bloc> {
    const layoutBloc = this.blocRepository.create({
      type: BlocTypeEnum.LAYOUT,
      status: BlocStatusEnum.DRAFT,
      name: 'Default Layout',
      content: layoutContentDefault
    });

    const savedLayoutBloc = await this.blocRepository.save(layoutBloc);

    return savedLayoutBloc;
  }

  public async findAndPaginateWithOptions(
    options: IPaginationOptions,
    filters: {
      search?: string;
      type?: BlocTypeEnum;
      status?: BlocStatusEnum;
    },
  ): Promise<IPaginationOutput<Bloc>> {
    const relations = options.relations;
    const conditions = [] as IConditions[];

    if (filters.search && filters.search !== '%') {
      conditions.push({
        type: TypeEnum.AND,
        key: 'name',
        operator: OperatorEnum.LIKE,
        value: filters.search,
        caseless: true,
      });
    }

    if (filters.type) {
      conditions.push({
        type: TypeEnum.AND,
        key: 'type',
        operator: OperatorEnum.EQUAL,
        value: filters.type,
      });
    }

    const blocs = await this.blocRepository.findAndPaginate({
      ...options,
      relations,
      conditions,
    });

    return blocs;
  }
}