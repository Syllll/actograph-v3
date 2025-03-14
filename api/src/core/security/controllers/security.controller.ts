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
import {
  IPaginationOptions,
  IPaginationOutput,
} from '@utils/repositories/base.repositories';
import { ParseEnumArrayPipe, ParseIncludePipe } from '@utils/pipes';
import { UserJwtService } from '@auth-jwt/services/userJwt.service';
import { getMode } from 'config/mode';
import { SecurityService } from '../services/security.service';

@Controller('security')
export class SecurityController extends BaseController {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly securityService: SecurityService,
  ) {
    super();
  }

  /**
   * Say hi, used for testing if the server is running
   * @returns {Promise<string>}
   */
  @Get('say-hi')
  async sayHi() {
    return 'hi';
  }

  @Post('activate-license')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async activateLicense(@Body() body: { key: string }) {
    return this.securityService.activateLicense(body.key);
  }

  @Get('local-user-name')
  async localUserName(@Req() req: any) {
    const mode = getMode();
    if (mode !== 'electron') {
      throw new InternalServerErrorException('Local user is only available in electron mode');
    }

    const result = this.securityService.getLocalUsername();

    return result;
  }
}