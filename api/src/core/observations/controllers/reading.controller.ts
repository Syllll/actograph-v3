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
  Delete,
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
import { Reading, ReadingTypeEnum } from '../entities/reading.entity';
import { IsArray, IsNotEmpty, IsNumber, ValidateNested, IsDate, IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class CreateReadingDto {
  @IsString()
  @IsOptional()
  tempId?: string | null;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsEnum(ReadingTypeEnum)
  @IsNotEmpty()
  type!: ReadingTypeEnum;

  @IsDateString()
  @IsNotEmpty()
  dateTime!: Date;

  @IsDateString()
  @IsNotEmpty()
  createdAt!: Date;

  @IsDateString()
  @IsNotEmpty()
  updatedAt!: Date;
}

class UpdateReadingDto {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  tempId?: string | null;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsEnum(ReadingTypeEnum)
  @IsNotEmpty()
  type!: ReadingTypeEnum;

  @IsDateString()
  @IsNotEmpty()
  dateTime!: Date;
}


class CreateReadingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReadingDto)
  readings!: CreateReadingDto[];

  @IsNumber()
  @IsNotEmpty()
  observationId!: number;
}

class UpdateReadingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReadingDto)
  readings!: UpdateReadingDto[];
  
  @IsNumber()
  @IsNotEmpty()
  observationId!: number;
}

class DeleteReadingsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ids!: number[];

  @IsNumber()
  @IsNotEmpty()
  observationId!: number;
}

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

  @Post()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async createMany(
    @Body() body: CreateReadingsDto,
    @Req() req: any,
  ) {
    const user = req.user;

    await this.observationService.check.canUserAccessObservation({
      observationId: body.observationId,
      userId: user.id,
    });

    return this.readingService.createMany(body.readings.map((reading) => ({
      ...reading,
      observationId: body.observationId,
    })
  ))
  ;
  }

  @Patch()
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async updateMany(
    @Body() body: UpdateReadingsDto,
    @Req() req: any,
  ) {
    const user = req.user;

    // Check if user can access observation
    await this.observationService.check.canUserAccessObservation({
      observationId: body.observationId,
      userId: user.id,
    });

    // Check all the readings are associated with the observation
    const observation = await this.observationService.findOne(body.observationId, {
      relations: ['readings'],
    });
    if (!observation || !observation.readings) {
      throw new NotFoundException('Observation not found');
    }
    const readings = observation.readings.filter((reading) => body.readings.some((r) => r.id === reading.id));
    if (readings.length !== body.readings.length) {
      throw new NotFoundException('Some readings were not found');
    }

    // Update the readings
    return this.readingService.updateMany(body.readings.map((reading) => ({
        ...reading,
      })),
      body.observationId,
    );
  }

  /**
   * Delete many readings, we use a POST request because it's easier to send an array of ids
   */
  @Post('delete')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async deleteMany(
    @Body() body: DeleteReadingsDto,
    @Req() req: any,
  ) {
    const user = req.user;

    await this.observationService.check.canUserAccessObservation({
      observationId: body.observationId,
      userId: user.id,
    });

    // Check all the readings are associated with the observation
    const observation = await this.observationService.findOne(body.observationId, {
      relations: ['readings'],
    });
    if (!observation || !observation.readings) {
      throw new NotFoundException('Observation not found');
    }
    const readings = observation.readings.filter((reading) => body.ids.includes(reading.id));
    if (readings.length !== body.ids.length) {
      throw new NotFoundException('Some readings were not found');
    }

    // Delete the readings
    return this.readingService.removeMany(body.ids.map(id => {
      return {
        id,
      }
    }));
  }
}

