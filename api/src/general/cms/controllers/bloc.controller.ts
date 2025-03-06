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
  ParseIntPipe,
  // Req,
} from '@nestjs/common';

import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { UserCreateForAdminDto } from '@users/dtos/user-create-for-admin.dto';

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
import { BlocService } from '../services/bloc/index.service';
import { Bloc } from '../entities/bloc.entity';

@UseGuards(JwtAuthGuard, UserRolesGuard)
@Controller('cms/blocs')
export class BlocController extends BaseController {
  constructor(
    private readonly service: BlocService,
  ) {
    super();
  }

  @Get(':type/:name')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async findFromUrl(
    @Param('type') type: string,
    @Param('name') name: string,
    ): Promise<Partial<Bloc>> {
    const bloc = await this.service.findForTypeAndName({
      type, name
    });

    return bloc;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async findFromId(
    @Param('id', ParseIntPipe) id: number,
    ): Promise<Partial<Bloc>> {
    const bloc = await this.service.findOneWithContent({id});

    return bloc;
  }
}