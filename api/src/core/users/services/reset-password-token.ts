import { UserJwtService } from '@auth-jwt/services/user-jwt.service';
import { NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '@users/repositories/user.repository';
import { UserService } from './user.service';

/**
 * Service pour la gestion des tokens de réinitialisation de mot de passe.
 * Permet de générer et valider des tokens JWT pour la réinitialisation sécurisée des mots de passe.
 *
 * Note: ce service délègue la génération au service UserJwt.
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
   * Récupère ou génère un token de réinitialisation de mot de passe.
   *
   * @param username - Le nom d'utilisateur pour lequel générer le token
   * @returns Le token de réinitialisation sauvegardé en base
   */
  async createResetPasswordToken(username: string): Promise<string> {
    const user = await this.jwtService.findByUsername(username);
    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    const token = uuidv4();
    await this.parentRepository.manager.update(
      'user-jwt',
      { id: user.id },
      { forgetPasswordToken: token },
    );

    return token;
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
