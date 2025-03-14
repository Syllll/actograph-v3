import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseController } from '@utils/controllers/base.controller';
import { UserJwtRepository } from '../repositories/user.repository';
import { UserJwt, UserJwtCreateDto } from '../entities/userJwt.entity';
import {
  UserJwtService,
  SuccessResponse,
  TokenResponse,
} from '../services/userJwt.service';

@Controller('auth-jwt')
export class AuthJwtController extends BaseController {
  private allowRegisterNewUserFromAuthJwt = true;

  constructor(
    @InjectRepository(UserJwtRepository)
    private userJwtRepository: UserJwtRepository,
    private usersService: UserJwtService,
  ) {
    super();
  }

  @Post('login')
  async postLogin(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    const user = await this.usersService.findByUsernamePassword(
      username,
      password,
    );
    if (!user) throw new HttpException('Wrong credentials', 403);

    const jwt = this.usersService.login(user);
    return {
      token: jwt,
    };
  }

  @Post('refreshToken')
  async refreshToekn(@Body('token') token: string) {
    let jwt: string | null = null;
    try {
      jwt = this.usersService.createNewTokenFromPreviousOne(token);
    } catch (err: any) {
      throw new UnauthorizedException('Token cannot be refreshed');
    }
    return {
      token: jwt,
    };
  }

  @Get('logout')
  logout(@Req() request: any, @Res() response: any) {
    request.logout();
    response.redirect(process.env.FRONTEND_URL);
  }

  @Post('register')
  async postRegister(
    @Body() user: UserJwtCreateDto,
  ): Promise<Partial<UserJwt>> {
    if (this.allowRegisterNewUserFromAuthJwt) {
      try {
        const result = await this.usersService.create(user);
        return result;
      } catch (err) {
        throw new HttpException('Creation impossible', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException(
        'Creation  not authorized',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /*
  @Post('activate')
  async postActivate(@Body('token') token: string): Promise<SuccessResponse> {
    const response = new SuccessResponse();
    const result = await this.usersService.activate(token);

    if (result && result.success) {
      (response.success = true),
        (response.message = result.message || 'User activated'),
        (response.errors = []);
    } else {
      throw new HttpException('Activation impossible', HttpStatus.BAD_REQUEST);
    }

    return response;
  }
*/

  @Post('password-forgot')
  async getNewPassword(
    @Body('username') username: string,
    @Body('resetPasswordUrl') resetPasswordUrl: string,
  ): Promise<SuccessResponse> {
    const response = new SuccessResponse();
    const result = await this.usersService.sendMailForNewPassword(
      username,
      resetPasswordUrl,
    );

    if (!result)
      throw new HttpException(
        'Récupération impossible',
        HttpStatus.BAD_REQUEST,
      );

    response.success = true;
    response.message = JSON.stringify(
      'Mail de récupération de mot de passe envoyé',
    );
    response.errors = [];

    return response;
  }

  @Post('recuperation')
  async postNewPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ): Promise<TokenResponse> {
    const response = new TokenResponse();
    const result = await this.usersService.changePasswordUser(token, password);

    if (!result.user)
      throw new HttpException(
        'Impossible to change password',
        HttpStatus.BAD_REQUEST,
      );

    response.token = this.usersService.login(result.user);
    return response;
  }
}
