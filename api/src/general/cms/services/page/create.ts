import { IConditions, IPaginationOptions, IPaginationOutput, OperatorEnum, TypeEnum } from "@utils/repositories/base.repositories";
import { Page, PageStatusEnum, PageTypeEnum } from "../../entities/page.entity";
import { PageRepository } from "../../repositories/page.repository";
import { PageService } from "./index.service";
import { User } from "@users/entities/user.entity";
import { AdminPageUpdateDto } from "../../dtos/admin/admin-page-update.dto";
import { AdminPageCreateDto } from "../../dtos/admin/admin-page-create.dto";
import { BlocService } from "../bloc/index.service";

export class Create {
  private pageRepository: PageRepository;
  private pageService: PageService;
  private blocService: BlocService;

  constructor(options: {
    pageRepository: PageRepository,
    pageService: PageService,
    blocService: BlocService,
  }) {
    this.pageRepository = options.pageRepository;
    this.pageService = options.pageService;
    this.blocService = options.blocService;
  }

  public async create(
    options: AdminPageCreateDto,
  ): Promise<Page> {
    
    // Get the url
    let url = options.url;
    // If the url is not present, create it from the name
    if (!url && options.name) {
      url  = options.name.toLowerCase().replace(/ /g, '-');
    }

    // Create and save the page in the db
    const page = this.pageRepository.create({
      ...options,
      url,
      status: PageStatusEnum.DRAFT,
    });
    const savedPage = await this.pageRepository.save(page);

    // Create the defaults blocs associated with the page
    await this.blocService.createDefaultBlocsForPage({
      pageId: savedPage.id,
    })

    return savedPage;
  }
}