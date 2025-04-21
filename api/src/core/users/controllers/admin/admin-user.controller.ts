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
  ValidationPipe,
  ExecutionContext,
  createParamDecorator,
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

import { User, allRelations } from '../../entities/user.entity';
import { UserService } from '../../services/user.service';
import { UserJwtService } from '@auth-jwt/services/user-jwt.service';
import { AdminUserUpdateDto } from '../../dtos/admin/admin-user-patch.dto';
import { PaginationDto } from '@utils/dtos';
import { ISearchQueryParams, SearchQueryParams } from '@utils/decorators';
import { ParseStringOrUndefinedPipe } from '@utils/pipes';

@Controller('users-admin')
export class AdminUserController extends BaseController {
  constructor(
    private readonly service: UserService,
    private readonly userJwtService: UserJwtService,
  ) {
    super();
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async getAll(): Promise<User[]> {
    const users = await this.service.getAll();
    return this.checkNotFound(users);
  }

  @Get('paginate')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async getWithPagination(
    @SearchQueryParams() searchQueryParams: ISearchQueryParams,
    @Query(
      'includes',
      new ParseEnumArrayPipe({
        type: ['userJwt'],
        separator: ',',
      }),
    )
    relations: string[] = [],
    @Query('searchString', new DefaultValuePipe('*'), ParseFilterPipe)
    searchString: string,
    @Query(
      'filterRoles',
      new ParseEnumArrayPipe({
        type: ['admin', 'user'],
        separator: ',',
      }),
    )
    filterRoles: string[] = [],
  ): Promise<IPaginationOutput<User>> {
    const results = await this.service.findAndPaginateWithOptions(
      {
        limit: searchQueryParams.limit,
        offset: searchQueryParams.offset,
        orderBy: searchQueryParams.orderBy,
        order: searchQueryParams.order,
        relations,
      },
      {
        search: searchString,
        roles: <UserRoleEnum[]>filterRoles,
      },
    );
    return results;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async getOne(@Param('id') id: number): Promise<Partial<User>> {
    const user = await this.service.findOne(id);
    return this.checkNotFound(user);
  }

  @Patch('resetPassword/:id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async resetPassword(@Param('id') id: number): Promise<{
    id: number;
    tempPassword: string;
  }> {
    return await this.service.askForResetPassword(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async create(@Body() body: UserCreateForAdminDto): Promise<Partial<User>> {
    try {
      if (body.userJwt?.username) {
        const usernameExists = await this.userJwtService.findByUsername(
          body.userJwt.username,
        );
        if (usernameExists) {
          throw new HttpException(
            'Un utilisateur existe déjà avec ce nom, essayez autre chose',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      return await this.service.create(body);
    } catch (err) {
      console.error(err);
      throw new HttpException('Creation impossible', HttpStatus.BAD_REQUEST);
    }
  }

  @Patch('current')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async update(@Body() body: AdminUserUpdateDto): Promise<User> {
    const userUpdated = await this.service.updateAdmin(body);
    return <User>userUpdated;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async remove(@Param('id') id: number): Promise<Partial<User> | undefined> {
    const user = await this.service.delete(id);
    return user;
  }
}
