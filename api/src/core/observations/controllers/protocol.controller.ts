import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Post,
  Param,
  Patch,
  Delete,
  Query,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
  forwardRef,
  Inject,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { allMainUsers, UserRoleEnum } from '@users/utils/user-role.enum';
import { Roles } from '@users/utils/roles.decorator';
import { BaseController } from '@utils/controllers/base.controller';
import { UserService } from 'src/core/users/services/user.service';
import { getMode } from 'config/mode';
import { ObservationService } from '../services/observation/index.service';
import { ProtocolService } from '../services/protocol/index.service';
import { ReadingService } from '../services/reading.service';
import { ActivityGraphService } from '../services/activity-graph.service';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { SearchQueryParams, ISearchQueryParams } from '@utils/decorators';
import { ParseEnumArrayPipe, ParseFilterPipe } from '@utils/pipes';
import { IPaginationOutput } from '@utils/repositories/base.repositories';
import {
  Protocol,
  ProtocolItem,
  ProtocolItemActionEnum,
  ProtocolItemTypeEnum,
} from '../entities/protocol.entity';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
class AddProtocolItemDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  action?: ProtocolItemActionEnum;

  @IsOptional()
  @IsString()
  type?: ProtocolItemTypeEnum;

  @IsOptional()
  @IsString()
  meta?: Record<string, any>;

  @IsNotEmpty()
  @IsNumber()
  protocolId!: number;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}

class EditProtocolItemDto {
  @IsNotEmpty()
  @IsString()
  id!: string;

  @IsNotEmpty()
  @IsNumber()
  protocolId!: number;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  action?: ProtocolItemActionEnum;

  @IsOptional()
  @IsString()
  type?: ProtocolItemTypeEnum;

  @IsOptional()
  @IsString()
  meta?: Record<string, any>;
}

@Controller('observations/protocols')
export class ProtocolController extends BaseController {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly observationService: ObservationService,
    private readonly protocolService: ProtocolService,
    private readonly readingService: ReadingService,
    private readonly activityGraphService: ActivityGraphService,
  ) {
    super();
  }

  @Delete('item/:protocolId/:itemId')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async deleteProtocolItem(
    @Param('protocolId', ParseIntPipe) protocolId: number,
    @Param('itemId') itemId: string,
    @Req() req: any,
  ) {
    const user = req.user;
    const protocol = await this.protocolService.findOne(protocolId, {
      relations: ['observation'],
    });
    if (!protocol?.observation || !protocol.id) {
      throw new NotFoundException('Protocol not found');
    }
    // Can the user access the protocol?
    await this.observationService.check.canUserAccessObservation({
      observationId: protocol.observation.id,
      userId: user.id,
    });

    await this.protocolService.items.removeItem({
      protocolId: protocol.id,
      itemId: itemId,
    });
  }

  @Patch('item/:id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async editProtocolItem(
    @Param('id') id: string,
    @Body() body: EditProtocolItemDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const protocol = await this.protocolService.findOne(body.protocolId, {
      relations: ['observation'],
    });
    if (!protocol?.observation) {
      throw new NotFoundException('Protocol not found');
    }
    // Can the user access the protocol?
    await this.observationService.check.canUserAccessObservation({
      observationId: protocol.observation.id,
      userId: user.id,
    });

    let output: ProtocolItem;

    if (body.type === ProtocolItemTypeEnum.Category) {
      output = await this.protocolService.items.editCategory({
        protocolId: body.protocolId,
        categoryId: id,
        name: body.name,
        description: body.description,
        action: body.action,
        order: body.order,
      });
    } else if (body.type === ProtocolItemTypeEnum.Observable) {
      output = await this.protocolService.items.editObservable({
        protocolId: body.protocolId,
        observableId: id,
        name: body.name,
        order: body.order,
      });
    } else {
      throw new BadRequestException('Invalid item type');
    }

    return output;
  }

  // Post to add a new protocol item
  @Post('item')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async addProtocolItem(@Body() body: AddProtocolItemDto, @Req() req: any) {
    const user = req.user;
    const protocol = await this.protocolService.findOne(body.protocolId, {
      relations: ['observation'],
    });
    if (!protocol?.observation) {
      throw new NotFoundException('Protocol not found');
    }
    // Can the user access the protocol?
    await this.observationService.check.canUserAccessObservation({
      observationId: protocol.observation.id,
      userId: user.id,
    });

    let output: ProtocolItem;

    if (body.type === ProtocolItemTypeEnum.Category) {
      output = await this.protocolService.items.addCategory({
        protocolId: body.protocolId,
        name: body.name,
        description: body.description,
        action: body.action,
        order: body.order ?? 0,
      });
    } else if (body.type === ProtocolItemTypeEnum.Observable) {
      if (!body.parentId) {
        throw new BadRequestException(
          'Parent ID is required for observable items',
        );
      }

      output = await this.protocolService.items.addObservable({
        protocolId: body.protocolId,
        name: body.name,
        description: body.description,
        order: body.order ?? 0,
        categoryId: body.parentId,
      });
    } else {
      throw new BadRequestException('Invalid item type');
    }

    return output;
  }

  @Get('paginate')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async getWithPagination(
    @Req() req: any,
    @SearchQueryParams() searchQueryParams: ISearchQueryParams,
    @Query(
      'includes',
      new ParseEnumArrayPipe({
        type: ['observation'],
        separator: ',',
      }),
    )
    relations: string[] = [],
    @Query('searchString', new DefaultValuePipe('*'), ParseFilterPipe)
    searchString: string,
  ): Promise<IPaginationOutput<Protocol>> {
    const user = req.user;
    const results = await this.protocolService.find.findAndPaginateWithOptions(
      {
        limit: searchQueryParams.limit,
        offset: searchQueryParams.offset,
        orderBy: searchQueryParams.orderBy,
        order: searchQueryParams.order,
        relations,
      },
      {
        searchString: searchString,
        userId: user.id,
      },
    );

    return results;
  }

  @Get('/from-observation/:observationId')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async findOneFromObservationId(
    @Param('observationId', ParseIntPipe) observationId: number,
    @Query(
      'includes',
      new ParseEnumArrayPipe({
        type: ['observation'],
        separator: ',',
      }),
    )
    relations: string[] = [],
    @Req() req: any,
  ) {
    const user = req.user;

    await this.observationService.check.canUserAccessObservation({
      observationId,
      userId: user.id,
    });

    const p = await this.protocolService.find.findOneFromObservation(
      observationId,
      {
        relations,
      },
    );
    return p;
  }
}
