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
import { ChoosePasswordDto } from '../dtos/choose-password.dto';
import {
  IPaginationOptions,
  IPaginationOutput,
} from '@utils/repositories/base.repositories';
import { ParseEnumArrayPipe, ParseIncludePipe } from '@utils/pipes';
import { UserJwtService } from '@auth-jwt/services/user-jwt.service';

/**
 * Controller pour les endpoints publics des utilisateurs.
 * Permet aux utilisateurs authentifiés de gérer leur propre profil :
 * - Consulter leur profil
 * - Mettre à jour leurs informations
 * - Gérer la réinitialisation de leur mot de passe
 */
@Controller('users')
export class UserController extends BaseController {
  constructor(
    private readonly service: UserService,
    private readonly userJwtService: UserJwtService,
  ) {
    super();
  }

  /**
   * Génère un token de réinitialisation de mot de passe pour un utilisateur.
   * Endpoint: GET /users/:username/resetPassword-token
   *
   * @param req - La requête HTTP (contient l'utilisateur authentifié)
   * @param username - Le nom d'utilisateur pour lequel générer le token
   * @returns Le token de réinitialisation de mot de passe
   * @throws NotFoundException si l'utilisateur n'existe pas
   */
  @Get(':username/resetPassword-token')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User, ...allMainUsers)
  async getResetPasswordToken(
    @Req() req: any,
    @Param('username', new DefaultValuePipe(undefined)) username: string,
  ): Promise<string> {
    const users = await this.service.findWithUsername(username);
    if (!users || users.length === 0) {
      throw new NotFoundException('User does not exist');
    }

    const resetPasswordToken =
      await this.service.resetPasswordToken.createResetPasswordToken(username);

    return resetPasswordToken;
  }

  /**
   * Permet à un utilisateur de définir un nouveau mot de passe après une demande de réinitialisation.
   * Endpoint: PATCH /users/choosePasswordAfterReset
   *
   * @param req - La requête HTTP (contient l'utilisateur authentifié)
   * @param body - Le corps de la requête contenant le nouveau mot de passe
   * @returns L'utilisateur mis à jour
   */
  @Patch('choosePasswordAfterReset')
  @UseGuards(JwtAuthGuard, UserRolesGuard)
  @Roles(UserRoleEnum.User, ...allMainUsers)
  async choosePasswordAfterReset(
    @Req() req: any,
    @Body() body: ChoosePasswordDto,
  ): Promise<User> {
    const user = req.user;

    return await this.service.chooseNewPasswordAfterReset(
      user.id,
      body.password,
    );
  }

  /**
   * Récupère les informations de l'utilisateur actuellement authentifié.
   * Endpoint: GET /users/current
   *
   * @param req - La requête HTTP (contient l'utilisateur authentifié)
   * @returns L'utilisateur actuel
   * @throws NotFoundException si l'utilisateur n'existe pas
   */
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

  /**
   * Met à jour les informations de l'utilisateur actuellement authentifié.
   * Endpoint: PATCH /users/current
   *
   * @param req - La requête HTTP (contient l'utilisateur authentifié)
   * @param body - Les données de mise à jour (prénom, nom, préférences, etc.)
   * @returns L'utilisateur mis à jour
   * @throws InternalServerErrorException si la mise à jour a échoué
   */
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
