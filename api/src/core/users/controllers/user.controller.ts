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
} from '@nestjs/common';
//import { ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@users/guards/jwt-auth.guard';
import { UserRolesGuard } from '@users/guards/user-roles.guard';
import { allMainUsers, UserRoleEnum } from '@users/utils/user-role.enum';
import { BaseController } from '@utils/controllers/base.controller';

import { UserService } from '../services/user.service';
import { Roles } from '../utils/roles.decorator';

// import { UserPatchDto } from '../entities/user.entity';
import { User } from '../entities/user.entity';
import { UserUpdateCurrentDto, UserUpdateDto } from '../dtos/user-patch.dto';
import { UserCreateDto } from '../dtos/user-create.dto';
import {
  IPaginationOptions,
  IPaginationOutput,
} from '@utils/repositories/base.repositories';
import { ParseEnumArrayPipe, ParseIncludePipe } from '@utils/pipes';
import { UserJwtService } from '@auth-jwt/services/userJwt.service';

@Controller('users')
export class UserController extends BaseController {
  constructor(
    private readonly service: UserService,
    private readonly userJwtService: UserJwtService,
  ) {
    super();
  }

  @Get(':username/resetPassword-token')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User, ...allMainUsers)
  async getResetPasswordToken(
    @Req() req: any,
    @Param('username', new DefaultValuePipe(undefined)) username: string,
  ): Promise<string> {
    const user = this.service.findWithUsername(username);
    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    const resetPasswordToken =
      await this.service.resetPasswordToken.createResetPasswordToken(username);

    return resetPasswordToken;
  }

  @Patch('choosePasswordAfterReset')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User, ...allMainUsers)
  async choosePasswordAfterReset(
    @Req() req: any,
    @Body()
    body: {
      password: string;
    },
  ): Promise<User> {
    const user = req.user;

    return await this.service.chooseNewPasswordAfterReset(
      user.id,
      body.password,
    );
  }

  @Get('current')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User, ...allMainUsers)
  async get(@Req() req: any): Promise<User> {
    const userId = req.user.id;
    const user = await this.service.findOne(userId);
    if (!user) {
      throw new NotFoundException('User does not exist');
    }
    return user;
  }

  @Patch('current')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User, ...allMainUsers)
  async update(
    @Req() req: any,
    @Body() body: UserUpdateCurrentDto,
  ): Promise<User> {
    const userId = req.user.id;
    const user = await this.service.update({
      ...body,
      id: userId,
    });
    if (!user) {
      throw new InternalServerErrorException('User could not be updated');
    }

    return user;
  }
}
