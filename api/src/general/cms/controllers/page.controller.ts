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
import { UserService } from '@core/users/services/user.service';
import { UserJwtService } from '@auth-jwt/services/userJwt.service';
import { PageCreateDto } from '../dtos/page-create.dto';
import { PageUpdateDto } from '../dtos/page-update.dto';
import { Page } from '../entities/page.entity';
import { PageService } from '../services/page/index.service';

@Controller('cms/pages')
export class PageController extends BaseController {
  constructor(
    private readonly service: PageService,
  ) {
    super();
  }

  @Get('with-content-and-layout/:url')
  async findFromUrl(
    @Param('url') url: string,
    ): Promise<Partial<Page>> {
    const page = await this.service.find.findFromUrlWithContentAndLayout(url);

    return page;
  }
}