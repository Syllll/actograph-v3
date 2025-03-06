import {
  Controller,
  Get,
  HttpStatus,
  HttpException,
  Post,
  Body,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
  Param,
  SerializeOptions,
  Query,
  DefaultValuePipe,
  Patch,
  Delete,
  NotFoundException,
  Req,
  BadRequestException,
  ParseBoolPipe,
  ParseIntPipe,
  // Req,
} from '@nestjs/common';

import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { UserCreateForAdminDto } from '@users/dtos/user-create-for-admin.dto';
import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { BaseController } from '@utils/controllers/base.controller';
import { Roles } from '@users/utils/roles.decorator';
import { UserRoleEnum } from '@users/utils/user-role.enum';
import { GROUP_ADMIN } from '@users/serializationGroups/groups';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ParseEnumArrayPipe } from '@utils/pipes/ParseEnumArray.pipe';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ParseFilterPipe } from '@utils/pipes/ParseFilter.pipe';
import {
  IPaginationOutput,
  IPaginationOptions,
  IConditions,
  OperatorEnum,
  TypeEnum,
} from '@utils/repositories/base.repositories';
import { User } from '@core/users/entities/user.entity';
import { UserService } from '@core/users/services/user.service';
import { UserJwtService } from '@auth-jwt/services/userJwt.service';
import { AdminPageCreateDto } from '../../dtos/admin/admin-page-create.dto';
import { AdminPageUpdateDto } from '../../dtos/admin/admin-page-update.dto';
import { Page } from '../../entities/page.entity';
import { PageService } from '../../services/page/index.service';
import { ParseBoolOrUndefinedPipe } from '@utils/pipes';

@Controller('cms/pages-admin')
export class AdminPageController extends BaseController {
  constructor(
    private readonly service: PageService,
    private readonly userService: UserService,
  ) {
    super();
  }

  @Get('paginate')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async getWithPagination(
    @Query('limit', new DefaultValuePipe(100)) limit: number,
    @Query('offset', new DefaultValuePipe(0)) offset: number,
    @Query('orderBy', new DefaultValuePipe('id')) orderBy: string,
    @Query('order', new DefaultValuePipe('DESC'))
    order: IPaginationOptions['order'],
    @Query(
      'includes',
      new ParseEnumArrayPipe({
        type: ['layout', 'content'],
        separator: ',',
      }),
    )
    relations: string[] = [],
    @Query('searchString', new DefaultValuePipe('*'), ParseFilterPipe)
    searchString: string,
  ): Promise<IPaginationOutput<Page>> {
    const results = await this.service.find.findAndPaginateWithOptions(
      {
        limit,
        offset,
        relations,
        orderBy,
        order,
      },
      {
        search: searchString,
      },
    );
    return results;
  }

  @Get('with-content-and-layout/:url')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async findFromUrl(
    @Param('url') url: string,
    ): Promise<Partial<Page>> {
    const page = await this.service.find.findFromUrlWithContentAndLayout(url, true);

    return page;
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async getAll(): Promise<Partial<Page>[]> {
    const pages = await this.service.findAll();
    return pages;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async get(
    @Param('id', ParseIntPipe) id: number,
    @Query(
      'includes',
      new ParseEnumArrayPipe({
        type: ['layout', 'content'],
        separator: ',',
      }),
    )
    relations: string[] = [],
  ): Promise<Partial<Page>> {
    const page = await this.service.findOne(id, {
      relations,
    });
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async create(@Body() userDto: AdminPageCreateDto,
  @Req() req: any): Promise<Partial<Page>> {
    const page = await this.service.create.create({
      ...userDto,
      createdBy: req.user,
    });
    return page;
  }

  @Patch()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async update(
    @Body() body: AdminPageUpdateDto,
  ): Promise<Page> {
    const page = await this.service.updateForAdmin(body);
    return page;  
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async remove(@Param('id') id: number): Promise<Partial<Page> | undefined> {
    const page = await this.service.delete(id);
    return page;
  }
}
