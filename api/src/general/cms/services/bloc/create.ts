import { IConditions, IPaginationOptions, IPaginationOutput, OperatorEnum, TypeEnum } from "@utils/repositories/base.repositories";
import { Page, PageStatusEnum, PageTypeEnum } from "../../entities/page.entity";
import { PageRepository } from "../../repositories/page.repository";
import { PageService } from "./../page/index.service";
import { User } from "@users/entities/user.entity";
import { AdminPageUpdateDto } from "../../dtos/admin/admin-page-update.dto";
import { AdminPageCreateDto } from "../../dtos/admin/admin-page-create.dto";
import { BlocService } from "../bloc/index.service";
import { BlocRepository } from "../../repositories/bloc.repository";
import { Bloc, BlocStatusEnum } from "../../entities/bloc.entity";
import { AdminBlocCreateDto } from "../../dtos/admin/admin-bloc-create.dto";
import { blocContentDefault } from "./content-default";

export class Create {
  private blocRepository: BlocRepository;
  private blocService: BlocService;

  constructor(options: {
    blocRepository: BlocRepository,
    blocService: BlocService,
  }) {
    this.blocRepository = options.blocRepository;
    this.blocService = options.blocService;
  }

  public async create(
    options: AdminBlocCreateDto,
  ): Promise<Bloc> {
    // Create and save the page in the db
    const bloc = this.blocRepository.create({
      ...options,
      status: BlocStatusEnum.DRAFT,
      content: blocContentDefault,
    });
    const saved = await this.blocRepository.save(bloc);

    return saved;
  }
}