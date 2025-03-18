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
} from '@nestjs/common';
import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { allMainUsers, UserRoleEnum } from '@users/utils/user-role.enum';
import { Roles } from '@users/utils/roles.decorator';
import { BaseController } from '@utils/controllers/base.controller';
import { UserService } from 'src/core/users/services/user.service';
import { getMode } from 'config/mode';
import { ObservationService } from '../services/observation.service';
import { ProtocolService } from '../services/protocol.service';
import { ReadingService } from '../services/reading.service';
import { ActivityGraphService } from '../services/activity-graph.service';
import { Observation } from '../entities/observation.entity';
import { IPaginationOutput } from '@utils/repositories/base.repositories';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { SearchQueryParams, ISearchQueryParams } from '@utils/decorators';
import { ParseEnumArrayPipe, ParseFilterPipe } from '@utils/pipes';

@Controller('observations')
export class ObservationController extends BaseController {
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
  @Roles(UserRoleEnum.Admin)
  async getWithPagination(
    @Req() req: any,
    @SearchQueryParams() searchQueryParams: ISearchQueryParams,
    @Query(
      'includes',
      new ParseEnumArrayPipe({
        type: ['user'],
        separator: ',',
      }),
    )
    relations: string[] = [],
    @Query('searchString', new DefaultValuePipe('*'), ParseFilterPipe)
    searchString: string,
  ): Promise<IPaginationOutput<Observation>> {
    const user = req.user;
    const results = await this.observationService.findAndPaginateWithOptions(
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

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async findAllForCurrentUser(@Req() req: any): Promise<Observation[]> {
    const user = req.user;
    return this.observationService.findAllForuser(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async findOne(@Param('id') id: number, @Req() req: any, 
  @Query('includes', new ParseEnumArrayPipe({
    type: ['user', 'protocol', 'readings', 'activityGraph'],
    separator: ',',
  }))
  relations: string[] = [],
  ): Promise<Observation> {
    const user = req.user;

    const observation = await this.observationService.findOne(id, {
      where: {
        user: {
          id: user.id,
        }
      },
      relations,
    });

    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    return <Observation>observation;
  }
  
}
