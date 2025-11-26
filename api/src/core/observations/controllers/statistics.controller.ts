import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { BaseController } from '@utils/controllers/base.controller';
import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { Roles } from '@users/utils/roles.decorator';
import { UserRoleEnum } from '@users/utils/user-role.enum';
import { StatisticsService } from '../services/statistics.service';
import { ObservationService } from '../services/observation/index.service';
import { GeneralStatisticsDto } from '../dtos/statistics-general.dto';
import { CategoryStatisticsDto } from '../dtos/statistics-category.dto';
import {
  ConditionalStatisticsRequestDto,
  ConditionalStatisticsDto,
} from '../dtos/statistics-conditional.dto';

@Controller('observations/:id/statistics')
export class StatisticsController extends BaseController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly observationService: ObservationService,
  ) {
    super();
  }

  @Get('general')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async getGeneralStatistics(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GeneralStatisticsDto> {
    const user = req.user;

    // Check if user can access the observation
    await this.observationService.check.canUserAccessObservation({
      observationId: id,
      userId: user.id,
    });

    return await this.statisticsService.getGeneralStatistics(id);
  }

  @Get('category/:categoryId')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async getCategoryStatistics(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('categoryId') categoryId: string,
  ): Promise<CategoryStatisticsDto> {
    const user = req.user;

    // Check if user can access the observation
    await this.observationService.check.canUserAccessObservation({
      observationId: id,
      userId: user.id,
    });

    return await this.statisticsService.getCategoryStatistics(id, categoryId);
  }

  @Post('conditional')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async getConditionalStatistics(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() request: ConditionalStatisticsRequestDto,
  ): Promise<ConditionalStatisticsDto> {
    const user = req.user;

    // Check if user can access the observation
    await this.observationService.check.canUserAccessObservation({
      observationId: id,
      userId: user.id,
    });

    return await this.statisticsService.getConditionalStatistics(id, request);
  }
}

