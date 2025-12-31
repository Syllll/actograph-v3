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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { Observation } from '../entities/observation.entity';
import { IPaginationOutput } from '@utils/repositories/base.repositories';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { SearchQueryParams, ISearchQueryParams } from '@utils/decorators';
import { ParseEnumArrayPipe, ParseFilterPipe } from '@utils/pipes';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { IChronicExport } from '../services/observation/export';
import { ObservationModeEnum } from '@actograph/core';

export class ICreateObservationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  videoPath?: string;

  @IsOptional()
  @IsEnum(ObservationModeEnum)
  mode?: ObservationModeEnum;
}

export class IUpdateObservationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  videoPath?: string;

  @IsOptional()
  @IsEnum(ObservationModeEnum)
  mode?: ObservationModeEnum;
}

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

  @Delete(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async delete(@Req() req: any, @Param('id') id: number) {
    const user = req.user;

    // check if the user is the owner of the observation
    const observation = await this.observationService.findOne(id, {
      where: {
        user: {
          id: user.id,
        },
      },
    });
    if (!observation) {
      throw new NotFoundException(
        'Cannot delete observation, you are not the owner',
      );
    }

    await this.observationService.delete(id);
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
        type: ['user'],
        separator: ',',
      }),
    )
    relations: string[] = [],
    @Query('searchString', new DefaultValuePipe('*'), ParseFilterPipe)
    searchString: string,
  ): Promise<IPaginationOutput<Observation>> {
    const user = req.user;
    const results =
      await this.observationService.find.findAndPaginateWithOptions(
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
    return this.observationService.find.findAllForuser(user.id);
  }

  @Post('clone-example')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async cloneExample(@Req() req: any): Promise<Observation> {
    const user = req.user;

    const observation =
      await this.observationService.example.cloneExampleObservation(user.id);
    return observation;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async create(@Req() req: any,
  @Body() body: ICreateObservationDto,
): Promise<Observation> {
    const user = req.user;

    const observation = await this.observationService.create({
      userId: user.id,
      name: body.name,
      description: body.description,
      videoPath: body.videoPath,
      mode: body.mode,
      protocol: {},
      readings: [],
      activityGraph: {},
    });
    
    return observation;
  }

  /**
   * Endpoint pour exporter une observation au format .jchronic
   * 
   * IMPORTANT : Cette route doit être définie AVANT la route @Get(':id')
   * car NestJS évalue les routes dans l'ordre de déclaration.
   * Sinon, '/25/export' serait interprété comme '/:id' avec id='25/export'
   * 
   * Processus :
   * 1. Vérification de l'authentification (JWT)
   * 2. Vérification des permissions (rôle User)
   * 3. Appel du service d'export qui :
   *    - Charge l'observation avec ses relations
   *    - Vérifie que l'utilisateur est propriétaire
   *    - Retire tous les IDs
   *    - Formate les données pour l'export
   * 4. Retourne les données JSON au frontend
   * 
   * @param id ID de l'observation à exporter
   * @param req Request contenant l'utilisateur authentifié
   * @returns Données d'export au format IChronicExport (sans IDs)
   */
  @Get(':id/export')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async exportObservation(
    @Param('id') id: number,
    @Req() req: any,
  ): Promise<IChronicExport> {
    const user = req.user;
    // Le service vérifie automatiquement que l'observation appartient à l'utilisateur
    const exportData = await this.observationService.export.exportObservation(
      id,
      user.id,
    );
    return exportData;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async findOne(
    @Param('id') id: number,
    @Req() req: any,
    @Query(
      'includes',
      new ParseEnumArrayPipe({
        type: ['user', 'protocol', 'readings', 'activityGraph'],
        separator: ',',
      }),
    )
    relations: string[] = [],
  ): Promise<Observation> {
    const user = req.user;

    const observation = await this.observationService.findOne(id, {
      where: {
        user: {
          id: user.id,
        },
      },
      relations,
    });

    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    return <Observation>observation;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async update(
    @Param('id') id: number,
    @Req() req: any,
    @Body() body: IUpdateObservationDto,
  ): Promise<Observation> {
    const user = req.user;

    // Check if the user is the owner of the observation
    const observation = await this.observationService.findOne(id, {
      where: {
        user: {
          id: user.id,
        },
      },
    });
    if (!observation) {
      throw new NotFoundException(
        'Cannot update observation, you are not the owner',
      );
    }

    // Update only provided fields
    const updateData: Partial<Observation> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.videoPath !== undefined) updateData.videoPath = body.videoPath;
    if (body.mode !== undefined) updateData.mode = body.mode;

    const updatedObservation = await this.observationService.update(id, updateData);
    return updatedObservation;
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  @UseInterceptors(FileInterceptor('file'))
  async importObservation(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Observation> {
    const user = req.user;

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Vérifier l'extension du fichier
    const fileName = file.originalname.toLowerCase();
    if (
      !fileName.endsWith('.jchronic') &&
      !fileName.endsWith('.chronic')
    ) {
      throw new BadRequestException(
        'Invalid file format. Expected .jchronic or .chronic file',
      );
    }

    // Pour .jchronic : convertir en string UTF-8
    // Pour .chronic : garder le Buffer (format binaire)
    const fileContent = fileName.endsWith('.jchronic')
      ? file.buffer.toString('utf8')
      : file.buffer;

    // Importer l'observation
    const observation = await this.observationService.import.importFromFile(
      fileContent,
      file.originalname,
      user.id,
    );

    return observation;
  }
}
