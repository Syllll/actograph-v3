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
import { SecurityService } from '../services/security/index.service';
import { LicenseService } from '../services/license/license.service';
import { License } from '../entities/license.entity';

@Controller('security')
export class SecurityController extends BaseController {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly securityService: SecurityService,
    private readonly licenseService: LicenseService,
  ) {
    super();
  }

  /**
   * Say hi, used for testing if the server is running
   * @returns {Promise<string>}
   */
  @Get('say-hi')
  sayHi(): string {
    return 'hi';
  }

  @Get('enabled-license')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async enabledLicense(@Req() req: any): Promise<License | null> {
    const user = req.user;
    return this.licenseService.findEnabledLicenseByUserId(user.id);
  }

  // **********************
  // Electron mode
  // **********************

  @Post('electron/determine-access')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async electronDetermineAccess(
    @Req() req: any,
    @Body() body: { key: string },
  ): Promise<{
    nextStep:
      | 'choose-access-type'
      | 'use-student-access'
      | 'use-license-access'
      | 'invalid-license';
    message?: string;
    key?: string;
  }> {
    const user = req.user;
    // We just started the application.

    const r = await this.securityService.electron.determineAccessFirstStep();

    // If we want to use the license access, we need to check the license file.
    if (r.nextStep === 'use-license-access') {
      try {
        await this.securityService.electron.checkLicenseFromLicenseFile({
          userId: user.id,
        });
      } catch (error: any) {
        return {
          nextStep: 'invalid-license',
          message: error.message,
        };
      }

      return {
        nextStep: 'use-license-access',
        message: 'License file found.',
      };
    }

    return r;
  }

  @Post('electron/activate-license')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async electronActivateLicense(@Body() body: { key: string }) {
    return this.securityService.electron.activateLicense(body.key);
  }

  @Post('electron/activate-student')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRoleEnum.User)
  async electronActivateStudent() {
    return this.securityService.electron.activateStudent();
  }

  @Get('electron/local-user-name')
  async electronLocalUserName(@Req() req: any) {
    const mode = getMode();
    if (mode !== 'electron') {
      throw new InternalServerErrorException(
        'Local user is only available in electron mode',
      );
    }

    const result = this.securityService.electron.getLocalUsername();

    return result;
  }

  // **********************
  // Web mode
  // **********************

  // **********************
}
