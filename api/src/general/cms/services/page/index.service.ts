import { Injectable, NotFoundException } from "@nestjs/common";
import { BaseService } from "@utils/services/base.service";
import { Page } from "../../entities/page.entity";
import { PageRepository } from "../../repositories/page.repository";
import { Create } from "./create";
import { Find } from "./find";
import { AdminPageUpdateDto } from "../../dtos/admin/admin-page-update.dto";
import { BlocService } from "../bloc/index.service";

@Injectable()
export class PageService extends BaseService<Page, PageRepository> {
  public create: Create;
  public find: Find;
  
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly blocService: BlocService,
  ) {
    super(pageRepository);

    this.create = new Create({
      pageRepository,
      pageService: this,
      blocService
    });
    
    this.find = new Find({
      pageRepository,
      pageService: this
    });
  }

  public async updateForAdmin(options: AdminPageUpdateDto): Promise<Page> {
    const page = await this.findOne(options.id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const updatedPage = await this.pageRepository.save({
      ...page,
      ...<any>options,
    });

    return updatedPage;
  }

  public override async delete(id: number): Promise<Page> {
    const page = await this.findOne(id, {
      relations: ['content']
    });
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Remove the content
    if (page.content) {
      await this.blocService.delete(page.content.id);
    }

    // Edit the name of the page
    page.name = `__${page.id}--deleted ${page.name}`;
    await this.pageRepository.save(page);

    // Remove the page
    const p = await super.delete(<number>page.id);

    return <Page>p;
  }
}