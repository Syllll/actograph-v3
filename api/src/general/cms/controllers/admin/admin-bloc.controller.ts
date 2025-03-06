import {
  Controller,
  Body,
  UseGuards,
  Patch,
  DefaultValuePipe,
  Get,
  Query,
  Delete,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { BaseController } from '@utils/controllers/base.controller';
import { Roles } from '@users/utils/roles.decorator';
import { UserRoleEnum } from '@users/utils/user-role.enum';
import { UserService } from '@core/users/services/user.service';
import { BlocService } from '../../services/bloc/index.service';
import { AdminBlocUpdateDto } from '../../dtos/admin/admin-bloc-update.dto';
import { Bloc, BlocStatusEnum, BlocTypeEnum } from '../../entities/bloc.entity';
import { ParseEnumArrayPipe, ParseEnumPipe, ParseFilterPipe } from '@utils/pipes';
import { IPaginationOptions, IPaginationOutput } from '@utils/repositories/base.repositories';
import { Page, PageStatusEnum, PageTypeEnum } from '../../entities/page.entity';
import { AdminBlocCreateDto } from '../../dtos/admin/admin-bloc-create.dto';

@Controller('cms/blocs-admin')
export class AdminBlocController extends BaseController {
  constructor(
    private readonly service: BlocService,
    private readonly userService: UserService,
  ) {
    super();
  }

  @Patch('content')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async update(
    @Body() body: AdminBlocUpdateDto,
  ): Promise<Bloc> {
    const b = await this.service.updateContent({
      id: body.id,
      content: body.content,
    })
    return b;  
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
        type: [],
        separator: ',',
      }),
    )
    relations: string[] = [],
    @Query('searchString', new DefaultValuePipe(undefined), ParseFilterPipe)
    searchString?: string,
    @Query('type', new DefaultValuePipe(undefined), new ParseEnumPipe(BlocTypeEnum))
    type?: BlocTypeEnum,
    @Query('status', new DefaultValuePipe(undefined), new ParseEnumPipe(BlocStatusEnum))
    status?: BlocStatusEnum,
  ): Promise<IPaginationOutput<Bloc>> {
    const results = await this.service.findAndPaginateWithOptions(
      {
        limit,
        offset,
        relations,
        orderBy,
        order,
      },
      {
        search: searchString,
        type,
        status,
      },
    );

    return results;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async remove(@Param('id') id: number): Promise<Partial<Bloc> | undefined> {
    const b = await this.service.delete(id);
    return b;
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async create(@Body() userDto: AdminBlocCreateDto,
  @Req() req: any): Promise<Partial<Bloc>> {
    const bloc = await this.service.create.create({
      ...userDto,
      createdBy: req.user,
    });
    return bloc;
  }
}