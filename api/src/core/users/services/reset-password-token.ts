import { UserJwtService } from '@auth-jwt/services/user-jwt.service';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '@users/repositories/user.repository';
import { UserService } from './user.service';

/**
 * Service pour la gestion des tokens de réinitialisation de mot de passe.
 * Permet de générer et valider des tokens JWT pour la réinitialisation sécurisée des mots de passe.
 *
 * Note: L'implémentation actuelle est incomplète (méthode retourne une chaîne vide).
 */
export class ResetPasswordToken {
  private parent: UserService;
  private parentRepository: UserRepository;
  private jwtService: UserJwtService;

  constructor(
    parent: UserService,
    parentRepository: UserRepository,
    jwtService: UserJwtService,
  ) {
    this.parent = parent;
    this.parentRepository = parentRepository;
    this.jwtService = jwtService;
  }

  /**
   * Crée un token JWT pour la réinitialisation de mot de passe.
   * Le token devrait contenir le nom d'utilisateur et une date d'expiration.
   *
   * @param username - Le nom d'utilisateur pour lequel générer le token
   * @returns Le token JWT (actuellement retourne une chaîne vide - implémentation à compléter)
   */
  async createResetPasswordToken(username: string): Promise<string> {
    // const jwt = await this.jwtService.signAsync(
    //   {
    //     username,
    //     createDate: new Date(),
    //   },
    //   {
    //     expiresIn: 60 * 60 * 1000,
    //   }
    // );
    // return jwt;
    return '';
  }

  // async projectFromShareToken(token: string): Promise<ProjectEntity> {
  //   const valid = await this.jwtService.verifyAsync(token);
  //   if (!valid) {
  //     throw new NotFoundException("Token is not valid");
  //   }

  //   const infoDecoded = <any>this.jwtService.decode(token);
  //   if (!infoDecoded || !infoDecoded.projectId) {
  //     throw new InternalServerErrorException("Token could not be decoded");
  //   }

  //   const project = await this.parent.projectFromIdWithLayersAndAssets(
  //     infoDecoded.id
  //   );
  //   if (!project) {
  //     throw new NotFoundException("Project could not be found");
  //   }

  //   return project;
  // }
}
