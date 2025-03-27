import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Post,
  Param,
  Patch,
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
  BadRequestException,
  ParseIntPipe,
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
import { IPaginationOutput } from '@utils/repositories/base.repositories';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { SearchQueryParams, ISearchQueryParams } from '@utils/decorators';
import { ParseEnumArrayPipe, ParseFilterPipe } from '@utils/pipes';
import { Observation } from '../entities/observation.entity';
import { Reading } from '../entities/reading.entity';

@Controller('observations/readings')
export class ReadingController extends BaseController {
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
    @Query('observationId', ParseIntPipe)
    observationId: number,
  ): Promise<IPaginationOutput<Reading>> {
    const user = req.user;

    await this.observationService.check.canUserAccessObservation({
      observationId,
      userId: user.id,
    });

    const results = await this.readingService.findAndPaginateWithOptions(
      {
        limit: searchQueryParams.limit,
        offset: searchQueryParams.offset,
        orderBy: searchQueryParams.orderBy,
        order: searchQueryParams.order,
        relations,
      },
      {
        searchString: searchString,
        observationId,
      },
    );

    return results;
  }
}
