import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, NotFoundException } from '@nestjs/common';
import { User as User } from './entities/user.entity';
import { UserService } from './services/user.service';

/**
 * Stratégie Passport pour l'authentification JWT des utilisateurs.
 * Cette stratégie valide les tokens JWT présents dans l'en-tête Authorization
 * et charge l'utilisateur correspondant depuis la base de données.
 *
 * La stratégie est enregistrée sous le nom 'jwt-user' et est utilisée par JwtAuthGuard.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-user') {
  constructor(private readonly userService: UserService) {
    super({
      // Extrait le token JWT depuis l'en-tête Authorization au format "Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Ne pas ignorer l'expiration du token
      ignoreExpiration: false,
      // Clé secrète pour vérifier la signature du token (depuis les variables d'environnement)
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  /**
   * Valide le payload du token JWT et retourne l'utilisateur correspondant.
   * Cette méthode est appelée automatiquement par Passport après la validation du token.
   *
   * @param payload - Le payload décodé du token JWT (contient l'ID du UserJwt)
   * @returns L'utilisateur trouvé dans la base de données
   * @throws NotFoundException si l'utilisateur n'est pas trouvé
   */
  async validate(payload: any): Promise<User> {
    const authId = payload.id;
    // console.log('authId', authId);
    const user = await this.userService.findFromUserJwtId(authId);
    // console.log('user', user);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
