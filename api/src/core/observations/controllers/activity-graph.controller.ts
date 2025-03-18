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
  ParseIntPipe,
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
import { ActivityGraph } from '../entities/activity-graph.entity';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { SearchQueryParams, ISearchQueryParams } from '@utils/decorators';
import { ParseEnumArrayPipe, ParseFilterPipe } from '@utils/pipes';
import { IPaginationOutput } from '@utils/repositories/base.repositories';

@Controller('observations/activity-graph')
export class ActivityGraphController extends BaseController {
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
}