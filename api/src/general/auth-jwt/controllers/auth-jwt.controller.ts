/**
 * Contrôleur pour l'authentification JWT
 * 
 * Ce contrôleur expose les endpoints REST pour l'authentification :
 * - Connexion (login)
 * - Déconnexion (logout)
 * - Inscription (register)
 * - Rafraîchissement de token (refreshToken)
 * - Réinitialisation de mot de passe (password-forgot, recuperation)
 * 
 * @module AuthJwtController
 */
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
import { UserJwt, UserJwtCreateDto } from '../entities/user-jwt.entity';
import {
  UserJwtService,
  SuccessResponse,
  TokenResponse,
} from '../services/user-jwt.service';

/**
 * Contrôleur d'authentification JWT
 * 
 * Gère toutes les routes liées à l'authentification des utilisateurs.
 */
@Controller('auth-jwt')
export class AuthJwtController extends BaseController {
  /**
   * Flag pour autoriser ou non l'inscription de nouveaux utilisateurs
   * 
   * Si défini à false, l'endpoint /register retournera une erreur 401.
   * Utile pour désactiver l'inscription publique en production.
   */
  private allowRegisterNewUserFromAuthJwt = true;

  constructor(
    @InjectRepository(UserJwtRepository)
    private userJwtRepository: UserJwtRepository,
    private usersService: UserJwtService,
  ) {
    super();
  }

  /**
   * Endpoint de connexion
   * 
   * Authentifie un utilisateur avec son nom d'utilisateur et son mot de passe.
   * Retourne un token JWT valide si les identifiants sont corrects.
   * 
   * @param username - Nom d'utilisateur
   * @param password - Mot de passe en clair
   * @returns { token: string } - Token JWT pour les requêtes authentifiées
   * @throws {HttpException} 403 - Si les identifiants sont incorrects
   * 
   * @route POST /auth-jwt/login
   */
  @Post('login')
  async postLogin(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    // Vérifier les identifiants (comparaison bcrypt du mot de passe)
    const user = await this.usersService.findByUsernamePassword(
      username,
      password,
    );
    if (!user) throw new HttpException('Wrong credentials', 403);

    // Générer et retourner le token JWT
    const jwt = this.usersService.login(user);
    return {
      token: jwt,
    };
  }

  /**
   * Endpoint de rafraîchissement de token
   * 
   * Génère un nouveau token JWT à partir d'un token existant valide.
   * Utile pour prolonger la session sans reconnecter l'utilisateur.
   * 
   * @param token - Token JWT actuel à rafraîchir
   * @returns { token: string } - Nouveau token JWT
   * @throws {UnauthorizedException} - Si le token est invalide ou expiré
   * 
   * @route POST /auth-jwt/refreshToken
   */
  @Post('refreshToken')
  async refreshToken(@Body('token') token: string) {
    let jwt: string | null = null;
    try {
      // Créer un nouveau token à partir de l'ancien (même payload, nouvelle expiration)
      jwt = this.usersService.createNewTokenFromPreviousOne(token);
    } catch (err: any) {
      throw new UnauthorizedException('Token cannot be refreshed');
    }
    return {
      token: jwt,
    };
  }

  /**
   * Endpoint de déconnexion
   * 
   * Déconnecte l'utilisateur et redirige vers la page d'accueil.
   * Note: Avec JWT, la déconnexion est principalement côté client
   * (suppression du token). Cette route peut être utilisée pour
   * des sessions Passport si nécessaire.
   * 
   * @param request - Requête HTTP
   * @param response - Réponse HTTP
   * 
   * @route GET /auth-jwt/logout
   */
  @Get('logout')
  logout(@Req() request: any, @Res() response: any) {
    request.logout();
    response.redirect(process.env.FRONTEND_URL);
  }

  /**
   * Endpoint d'inscription
   * 
   * Crée un nouveau compte utilisateur.
   * Le mot de passe est automatiquement hashé avec bcrypt.
   * 
   * @param user - Données du nouvel utilisateur (username, password, activated?)
   * @returns { id: number, username: string } - Informations de l'utilisateur créé
   * @throws {HttpException} 401 - Si l'inscription n'est pas autorisée
   * @throws {HttpException} 400 - Si la création échoue
   * 
   * @route POST /auth-jwt/register
   */
  @Post('register')
  async postRegister(
    @Body() user: UserJwtCreateDto,
  ): Promise<Partial<UserJwt>> {
    // Vérifier si l'inscription est autorisée
    if (this.allowRegisterNewUserFromAuthJwt) {
      try {
        // Créer l'utilisateur (mot de passe hashé automatiquement)
        const result = await this.usersService.create(user);
        return result;
      } catch (err) {
        throw new HttpException('Creation impossible', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException(
        'Creation not authorized',
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

  /**
   * Endpoint de demande de réinitialisation de mot de passe
   * 
   * Génère un token de réinitialisation et envoie un email à l'utilisateur
   * avec un lien pour réinitialiser son mot de passe.
   * 
   * @param username - Nom d'utilisateur ou email de l'utilisateur
   * @param resetPasswordUrl - URL complète du lien de réinitialisation (incluant le token)
   * @returns { success: boolean, message: string, errors: string[] }
   * @throws {HttpException} 400 - Si la récupération est impossible
   * 
   * @route POST /auth-jwt/password-forgot
   */
  @Post('password-forgot')
  async getNewPassword(
    @Body('username') username: string,
    @Body('resetPasswordUrl') resetPasswordUrl: string,
  ): Promise<SuccessResponse> {
    const response = new SuccessResponse();
    // Générer le token et envoyer l'email
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

  /**
   * Endpoint de réinitialisation de mot de passe
   * 
   * Réinitialise le mot de passe d'un utilisateur à partir d'un token
   * de réinitialisation valide. Retourne un nouveau token JWT pour
   * connecter automatiquement l'utilisateur après la réinitialisation.
   * 
   * @param token - Token de réinitialisation reçu par email
   * @param password - Nouveau mot de passe en clair
   * @returns { token: string, message: string, errors: string[] }
   * @throws {HttpException} 400 - Si la réinitialisation est impossible
   * 
   * @route POST /auth-jwt/recuperation
   */
  @Post('recuperation')
  async postNewPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ): Promise<TokenResponse> {
    const response = new TokenResponse();
    // Changer le mot de passe et récupérer l'utilisateur mis à jour
    const result = await this.usersService.changePasswordUser(token, password);

    if (!result.user)
      throw new HttpException(
        'Impossible to change password',
        HttpStatus.BAD_REQUEST,
      );

    // Générer un nouveau token JWT pour connecter l'utilisateur
    response.token = this.usersService.login(result.user);
    return response;
  }
} 