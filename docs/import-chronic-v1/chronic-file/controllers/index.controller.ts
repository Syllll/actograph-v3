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
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  ParseIntPipe,
  ParseBoolPipe,
  UploadedFiles,
  UseInterceptors,
  FileTypeValidator,
} from '@nestjs/common';
//import { ApiTags } from '@nestjs/swagger'
// Import file interceptor
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@auth-jwt/guards/jwt-auth.guard';
import { allMainUsers, UserRoleEnum } from '@users/utils/user-role.enum';
import { BaseController } from '@utils/controllers/base.controller';

import { UserService } from 'src/core/users/services/user.service';
import { Roles } from 'src/core/users/utils/roles.decorator';
import { UserRolesGuard } from 'src/core/users/guards/user-roles.guard';
import {
  IPaginationOptions,
  IPaginationOutput,
} from '@utils/repositories/base.repositories';
import { ParseEnumArrayPipe, ParseIncludePipe } from '@utils/pipes';
import { UserJwtService } from '@auth-jwt/services/userJwt.service';
import { ChronicFileService } from '../services/index.service';
import { fileURLToPath } from 'url';
import { UserEntity } from '@users/entities/user.entity';
import { ObservationEntity } from 'src/core/observations/entities/observation.entity';

@Controller('api/chronicfile')
export class ChronicFileController extends BaseController {
  constructor(
    private readonly service: ChronicFileService,
    private readonly userService: UserService,
  ) {
    super();
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1000 * 1000 }), // 500 Mo
          new FileTypeValidator({ fileType: 'application/octet-stream' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ObservationEntity> {
    const user = await this.userService.findCurrentUserById(req.user.id);
    // console.log('file', file.originalname, file.mimetype);
    const newlyCreatedObservation =
      await this.service.importExport.importChronic({
        files: [file],
        user,
      });
    // await this.service.importFromFile('/home/syl/Documents/dd.chronic');
    return newlyCreatedObservation[0];
  }

  @Post('export')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async export(
    @Req() req: any,
    @Query('obsId', new ParseIntPipe()) obsId: number | undefined,
  ): Promise<string> {
    console.log(obsId);
    // await this.service.importFromFile('/home/syl/Documents/dd.chronic');
    return 'OK';
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User)
  async merge(
    @Req() req: any,
    @Query('mod', new ParseBoolPipe()) mod: boolean | undefined,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1000 * 1000 }), // 500 Mo
          new FileTypeValidator({ fileType: /\.(chronic)$/ }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ): Promise<string> {
    // await this.service.importFromFile('/home/syl/Documents/dd.chronic');
    return 'OK';
  }

  @Post('example')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.Admin)
  async importExampleIntoDatabase(
    @Req() req: any,
    @Query('name') name: string | undefined,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1000 * 1000 }), // 500 Mo
          new FileTypeValidator({ fileType: /\.(chronic)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<string> {
    // await this.service.importFromFile('/home/syl/Documents/dd.chronic');
    return 'OK';
  }
}
