/**
 * Service pour la gestion des utilisateurs JWT
 * 
 * Ce service gère toutes les opérations liées aux utilisateurs :
 * - Création et authentification
 * - Gestion des tokens JWT
 * - Activation de comptes
 * - Réinitialisation de mots de passe
 * - Envoi d'emails
 * 
 * @module UserJwtService
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import * as sgMail from '@sendgrid/mail';

import { UserJwt, UserJwtCreateDto } from '../entities/user-jwt.entity';
import { UserJwtRepository } from '../repositories/user.repository';

import { AuthJwtPasswordForgotEvent } from '../events/auth-jwt-password-forgot.event';
import { AuthJwtUserCreatedEvent } from '../events/auth-jwt-user-created.event';
import { AuthJwtUserActivatedEvent } from '../events/auth-jwt-user-activated.event';

/**
 * Réponse contenant un token JWT
 */
export class TokenResponse {
  token!: string;
  message!: string;
  errors!: string[];
}

/**
 * Réponse générique de succès
 */
export class SuccessResponse {
  success!: boolean;
  message!: string;
  errors!: string[];
  /** Résultat spécifique optionnel */
  output?: any;
}

/**
 * Service de gestion des utilisateurs JWT
 * 
 * Fournit toutes les méthodes nécessaires pour gérer les utilisateurs
 * et l'authentification JWT.
 */
@Injectable()
export class UserJwtService {
  constructor(
    // Inject the repository as class member
    @InjectRepository(UserJwtRepository)
    private readonly userJwtRepository: UserJwtRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Crée un nouvel utilisateur
   * 
   * Hash le mot de passe avec bcrypt (10 rounds) et crée l'utilisateur
   * dans la base de données. Émet un événement si demandé.
   * 
   * @param userCreateDto - Données du nouvel utilisateur
   * @param emitUserCreateSignal - Si true, émet un événement 'authJwt.userCreated'
   * @returns { id: number, username: string } - Informations de l'utilisateur créé
   */
  async create(
    userCreateDto: UserJwtCreateDto,
    emitUserCreateSignal = true,
  ): Promise<Pick<UserJwt, 'id' | 'username'>> {
    // Hasher le mot de passe avec bcrypt (10 rounds de salage)
    const encryptedPassword = await bcrypt.hash(userCreateDto.password, 10);

    // Préparer les données de l'utilisateur à créer
    const UserToBeCreated = {
      activationToken: uuidv4(), // Générer un token d'activation unique
      password: encryptedPassword,
      username: userCreateDto.username,
      activated: true, // Par défaut, les utilisateurs sont activés immédiatement
      // Note: userCreateDto.activated pourrait être utilisé pour contrôler l'activation
    };

    // Créer et sauvegarder l'utilisateur
    const newUser = this.userJwtRepository.create(UserToBeCreated);
    const savedUser = await this.userJwtRepository.save(newUser);

    // Émettre un événement si demandé (pour notifications, logs, etc.)
    if (emitUserCreateSignal) {
      await this.eventEmitter.emitAsync(
        'authJwt.userCreated',
        new AuthJwtUserCreatedEvent(savedUser),
      );
    }

    // Retourner uniquement les informations non sensibles
    return {
      id: savedUser.id,
      username: savedUser.username,
    };
  }

  /**
   * Génère un token JWT pour un utilisateur
   * 
   * Crée un token JWT contenant l'ID et le nom d'utilisateur.
   * Le token expire après 1 heure (3600 secondes).
   * 
   * @param user - Utilisateur pour lequel générer le token
   * @returns Token JWT signé
   */
  login(user: UserJwt): string {
    // Payload du token (données incluses dans le token)
    const payload = { id: user.id, username: user.username };
    // Signer le token avec expiration de 1 heure
    return this.jwtService.sign(payload, {
      expiresIn: '3600s', // Le token expire après 1 heure de création
    });
  }

  /**
   * Crée un nouveau token JWT à partir d'un token existant
   * 
   * Vérifie que le token est valide, extrait le payload,
   * et génère un nouveau token avec les mêmes données mais
   * une nouvelle date d'expiration (rafraîchissement).
   * 
   * @param token - Token JWT existant à rafraîchir
   * @returns Nouveau token JWT ou null si le token est invalide
   */
  createNewTokenFromPreviousOne(token: string): string | null {
    let output: string | null = null;
    // Vérifier que le token est valide (signature et expiration)
    if (this.jwtService.verify(token)) {
      // Décoder le payload du token
      const payload = this.jwtService.decode(token);
      if (payload) {
        const p = <any>payload;
        // Créer un nouveau token avec le même payload mais nouvelle expiration
        output = this.jwtService.sign(
          {
            id: p.id,
            username: p.username,
          },
          {
            expiresIn: '3600s', // Nouvelle expiration : 1 heure à partir de maintenant
          },
        );
      }
    }
    return output;
  }

  /**
   * Active un compte utilisateur avec un token d'activation
   * 
   * Trouve l'utilisateur correspondant au token d'activation
   * et active son compte. Émet un événement après activation.
   * 
   * @param activationToken - Token d'activation unique
   * @returns { success: boolean, message: string, errors: string[] }
   */
  async activate(activationToken: string) {
    const result = new SuccessResponse();
    result.success = false;
    result.message = 'Activation failure';
    try {
      // Trouver l'utilisateur avec ce token d'activation
      const user = await this.userJwtRepository.findOne({
        where: {
          activationToken,
        },
      });

      if (!user) {
        throw new NotFoundException();
      }

      // Si déjà activé, retourner succès sans modification
      if (user.activated === true) {
        result.success = true;
        result.message = 'already activated';
        return result;
      }

      // Activer le compte
      user.activated = true;
      this.userJwtRepository.save(user);
      result.success = true;

      // Émettre un événement d'activation
      await this.eventEmitter.emitAsync(
        'authJwt.userActivated',
        new AuthJwtUserActivatedEvent(user),
      );

      return result;
    } catch (error: any) {
      result.errors = [`${error.code} - ${error.message}`];
      return result;
    }
  }

  /**
   * Trouve un utilisateur par son nom d'utilisateur (insensible à la casse)
   * 
   * Recherche un utilisateur activé uniquement.
   * La recherche est insensible à la casse (majuscules/minuscules).
   * 
   * @param username - Nom d'utilisateur à rechercher
   * @returns Utilisateur trouvé ou null
   */
  async findByUsername(username: string): Promise<UserJwt | null> {
    const user = await this.userJwtRepository
      .createQueryBuilder()
      // Recherche insensible à la casse
      .andWhere('LOWER(username) = LOWER(:username)', { username })
      // Uniquement les utilisateurs activés
      .andWhere('activated = true')
      .getOne();

    return user;
  }

  /**
   * Authentifie un utilisateur avec son nom d'utilisateur et son mot de passe
   * 
   * Compare le mot de passe fourni avec le hash stocké en base de données
   * en utilisant bcrypt. Retourne l'utilisateur complet si l'authentification réussit.
   * 
   * @param username - Nom d'utilisateur
   * @param password - Mot de passe en clair
   * @returns Utilisateur authentifié
   * @throws {BadRequestException} - Si les identifiants sont incorrects
   * @throws {HttpException} 404 - Si l'utilisateur n'est pas trouvé après authentification
   */
  async findByUsernamePassword(
    username: string,
    password: string,
  ): Promise<UserJwt> {
    // Récupérer l'utilisateur avec le mot de passe (select: false par défaut, donc explicitement demandé)
    const user = await this.userJwtRepository.findOne({
      where: {
        username: username,
      },
      select: ['username', 'id', 'password', 'activated'],
    });

    // Vérifier le mot de passe avec bcrypt.compare
    if (user?.password && (await bcrypt.compare(password, user.password))) {
      // Si l'authentification réussit, récupérer l'utilisateur complet
      const fullUser = await this.userJwtRepository.findOne({
        where: { id: user.id },
      });
      if (fullUser) return fullUser;
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    // Si le mot de passe ne correspond pas ou l'utilisateur n'existe pas
    throw new BadRequestException();
  }

  /**
   * Trouve un utilisateur par son ID
   * 
   * @param id - ID de l'utilisateur
   * @returns Utilisateur trouvé
   * @throws {NotFoundException} - Si l'utilisateur n'existe pas
   */
  async findById(id: number): Promise<UserJwt> {
    const user = await this.userJwtRepository.findOneFromId(id);
    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   * 
   * Génère un token de réinitialisation unique, le sauvegarde pour l'utilisateur,
   * émet un événement, et envoie un email via SendGrid avec le lien de réinitialisation.
   * 
   * @param email - Email/nom d'utilisateur de l'utilisateur
   * @param resetPasswordUrl - URL complète du lien de réinitialisation (doit inclure le token)
   * @returns Utilisateur avec le token de réinitialisation généré
   * @throws {NotFoundException} - Si l'utilisateur n'existe pas
   */
  async sendMailForNewPassword(email: string, resetPasswordUrl: string) {
    // Trouver l'utilisateur par email/username
    const user = await this.userJwtRepository.findOne({
      where: {
        username: email,
      },
      select: ['id', 'username', 'forgetPasswordToken', 'activated'],
    });
    if (!user) {
      throw new NotFoundException();
    }

    // Générer et sauvegarder un nouveau token de réinitialisation
    user.forgetPasswordToken = uuidv4();
    await this.userJwtRepository.save(user);

    // Émettre un événement de demande de réinitialisation
    await this.eventEmitter.emitAsync(
      'authJwt.passwordForgot',
      new AuthJwtPasswordForgotEvent(user),
    );

    // Envoyer l'email via SendGrid si la clé API est configurée
    const sgKey = process.env.SENDGRID_API_KEY;
    if (sgKey) {
      const emailFrom = <string>process.env.EMAIL_FROM;
      sgMail.setApiKey(sgKey);
      const msg = {
        to: { email },
        from: { email: emailFrom }, // Utiliser l'adresse email ou le domaine vérifié
        subject: `${process.env.APP_NAME} - Reset Password`,
        text: 'Click on this link to reset your password : ' + resetPasswordUrl,
        html:
          '<a href="' +
          resetPasswordUrl +
          '">Click here</a> to reset your password.',
      };

      try {
        await sgMail.send(msg);
      } catch (error: any) {
        console.error(error);
        if (error.response) {
          console.error(error.response.body);
        }
      }
    }

    return user;
  }

  /**
   * Trouve un utilisateur par son token de réinitialisation de mot de passe
   * 
   * @param token - Token de réinitialisation
   * @returns Utilisateur correspondant au token
   * @throws {NotFoundException} - Si aucun utilisateur ne correspond au token
   */
  async findByRecuperationToken(token: string): Promise<UserJwt> {
    const user = await this.userJwtRepository.findOneBy({
      forgetPasswordToken: token,
    });

    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  /**
   * Change le mot de passe d'un utilisateur à partir d'un token de réinitialisation
   * 
   * Trouve l'utilisateur avec le token, puis change son mot de passe
   * et supprime le token de réinitialisation.
   * 
   * @param token - Token de réinitialisation
   * @param password - Nouveau mot de passe en clair
   * @returns { user: UserJwt } - Utilisateur avec le mot de passe changé
   * @throws {NotFoundException} - Si le token est invalide ou l'utilisateur n'existe pas
   */
  async changePasswordUser(token: string, password: string) {
    // Trouver l'utilisateur avec le token
    const userInstance = await this.findByRecuperationToken(token);
    if (!userInstance) {
      throw new NotFoundException();
    }

    // Changer le mot de passe
    return await this.changePassword(userInstance.id, password);
  }

  /**
   * Change le mot de passe d'un utilisateur par son ID
   * 
   * Hash le nouveau mot de passe avec bcrypt et supprime le token
   * de réinitialisation s'il existe.
   * 
   * @param userId - ID de l'utilisateur
   * @param password - Nouveau mot de passe en clair
   * @returns { user: UserJwt } - Utilisateur avec le mot de passe changé
   * @throws {NotFoundException} - Si l'utilisateur n'existe pas
   */
  async changePassword(userId: number, password: string) {
    const result: { user: UserJwt | null } = {
      user: null,
    };

    // Récupérer l'utilisateur avec le mot de passe
    const user = await this.userJwtRepository.findOne({
      where: {
        id: userId,
      },
      select: ['username', 'id', 'password', 'activated'],
    });
    if (!user) {
      throw new NotFoundException();
    }
    // Hasher le nouveau mot de passe
    user.password = await bcrypt.hash(password, 10);
    // Supprimer le token de réinitialisation
    user.forgetPasswordToken = null;
    await this.userJwtRepository.save(user);
    result.user = user;
    return result;
  }

  /**
   * Sauvegarde un utilisateur (création ou mise à jour)
   * 
   * @param userJwt - Utilisateur à sauvegarder
   * @returns Utilisateur sauvegardé
   */
  async save(userJwt: UserJwt) {
    return await this.userJwtRepository.save(userJwt);
  }

  /**
   * Supprime logiquement un utilisateur (soft delete)
   * 
   * L'utilisateur n'est pas physiquement supprimé de la base de données,
   * mais marqué comme supprimé.
   * 
   * @param userJwt - Utilisateur à supprimer
   * @returns Utilisateur supprimé logiquement
   */
  async softRemove(userJwt: UserJwt) {
    return await this.userJwtRepository.softRemove(userJwt);
  }
} 