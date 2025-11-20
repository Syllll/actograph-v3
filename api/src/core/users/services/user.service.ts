import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { UserJwtService } from '@auth-jwt/services/user-jwt.service';
import { BaseService } from '@utils/services/base.service';
import { AuthJwtUserCreatedEvent } from '@auth-jwt/events/auth-jwt-user-created.event';
import { UserCreateForAdminDto } from '../dtos/user-create-for-admin.dto';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { UserRoleEnum } from '@users/utils/user-role.enum';
import { UserUpdateDto } from '@users/dtos/user-patch.dto';
import { AdminUserUpdateDto } from '@users/dtos/admin/admin-user-patch.dto';
import {
  IConditions,
  IPaginationOptions,
  OperatorEnum,
  TypeEnum,
} from '@utils/repositories/base.repositories';
import { passwordCheckRules } from './password.rules';
import { ResetPasswordToken } from './reset-password-token';

/**
 * Service principal pour la gestion des utilisateurs.
 * Fournit toutes les opérations CRUD et les fonctionnalités métier liées aux utilisateurs :
 * création, mise à jour, suppression, recherche, gestion des mots de passe, etc.
 */
@Injectable()
export class UserService extends BaseService<User, UserRepository> {
  /** Service pour la gestion des tokens de réinitialisation de mot de passe */
  public resetPasswordToken: ResetPasswordToken;

  constructor(
    // Inject the repository as class member
    @InjectRepository(UserRepository)
    private readonly repository: UserRepository,
    private readonly userJwtService: UserJwtService,
  ) {
    super(repository);

    this.resetPasswordToken = new ResetPasswordToken(
      this,
      repository,
      userJwtService,
    );
  }

  /**
   * Trouve un utilisateur à partir de l'ID de son UserJwt associé.
   *
   * @param id - L'ID du UserJwt
   * @returns L'utilisateur trouvé ou null si aucun utilisateur n'est trouvé
   */
  async findFromUserJwtId(id: number): Promise<User | null> {
    return await this.repository.findOne({
      where: {
        userJwt: {
          id: id,
        },
      },
    });
  }

  /**
   * Permet à un utilisateur de choisir un nouveau mot de passe après une demande de réinitialisation.
   * Vérifie que la réinitialisation est en cours avant de permettre le changement.
   *
   * @param userId - L'ID de l'utilisateur
   * @param newPassword - Le nouveau mot de passe à définir
   * @returns L'utilisateur mis à jour
   * @throws NotFoundException si l'utilisateur n'est pas trouvé
   * @throws InternalServerErrorException si aucune réinitialisation n'est en cours
   */
  async chooseNewPasswordAfterReset(
    userId: number,
    newPassword: string,
  ): Promise<User> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException("L`utilisateur n'a pas été trouvé");
    }
    const userJwt = user.userJwt;

    if (!user.resetPasswordOngoing) {
      throw new InternalServerErrorException(
        'Un reset doit être en cours pour que cette opération fonctionne',
      );
    }

    await this.userJwtService.changePassword(userJwt.id, newPassword);

    await this.update({
      id: user.id,
      resetPasswordOngoing: false,
    });

    const newUser = await this.findOne(userId);
    if (!newUser) {
      throw new NotFoundException("Le nouvel utilisateur n'a pas été trouvé");
    }

    return newUser;
  }

  /**
   * Génère un nouveau mot de passe temporaire pour un utilisateur et marque la réinitialisation comme en cours.
   * Le mot de passe généré respecte les règles de sécurité définies dans passwordCheckRules.
   *
   * @param userId - L'ID de l'utilisateur pour lequel générer un nouveau mot de passe
   * @returns Un objet contenant l'ID de l'utilisateur et le mot de passe temporaire généré
   * @throws NotFoundException si l'utilisateur n'est pas trouvé
   * @throws InternalServerErrorException si le mot de passe n'a pas pu être généré après 150 tentatives
   */
  async askForResetPassword(userId: number): Promise<{
    id: number;
    tempPassword: string;
  }> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException("L`utilisateur n'a pas été trouvé");
    }

    const userJwt = user.userJwt;

    /**
     * Génère une chaîne aléatoire de 8 caractères à partir d'un alphabet étendu.
     * @returns Une chaîne de 8 caractères aléatoires
     */
    function generateP() {
      let pass = '';
      const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + '0123456789@#$*µ!:;,/§?{}=@&';

      for (let i = 1; i <= 8; i++) {
        const char = Math.floor(Math.random() * str.length + 1);

        pass += str.charAt(char);
      }

      return pass;
    }

    // Génère un mot de passe temporaire valide (respectant les règles de sécurité)
    let isValid = false;
    const maxTryCount = 150;
    let count = 0;
    let tempPassword = '';
    while (count < maxTryCount && isValid === false) {
      tempPassword =
        Math.random()
          .toString(36)
          .slice(2, 2 + 8) + generateP();

      // Password must respect some rules
      isValid = passwordCheckRules(tempPassword) === true;

      count++;
    }
    if (!isValid) {
      throw new InternalServerErrorException(
        `Le mot de passe n'a pas pu être généré, veuillez essayer à nouveau.`,
      );
    }

    // Met à jour le mot de passe et marque la réinitialisation comme en cours
    await this.userJwtService.changePassword(userJwt.id, tempPassword);
    await this.update({
      id: user.id,
      resetPasswordOngoing: true,
    });

    return {
      id: user.id,
      tempPassword,
    };
  }

  /**
   * Récupère tous les utilisateurs avec leurs relations userJwt.
   *
   * @returns La liste de tous les utilisateurs
   */
  async getAll(): Promise<User[]> {
    const users = await this.repository.find({
      relations: ['userJwt'],
    });

    return users;
  }

  /**
   * Trouve un utilisateur par son ID avec la relation userJwt.
   *
   * @param id - L'ID de l'utilisateur
   * @returns L'utilisateur trouvé ou undefined
   */
  override async findOne(id: number): Promise<User | undefined> {
    const user = await this.repository.findOneFromId(id, {
      relations: ['userJwt'],
    });

    return user;
  }

  /**
   * Trouve des utilisateurs par leur nom d'utilisateur JWT.
   *
   * @param username - Le nom d'utilisateur à rechercher
   * @returns La liste des utilisateurs trouvés ou undefined
   */
  async findWithUsername(
    username: string,
  ): Promise<Partial<User[]> | undefined> {
    const users = await this.repository.find({
      relations: ['userJwt'],
      where: {
        userJwt: {
          username: username,
        },
      },
    });

    return users;
  }

  /**
   * Trouve l'utilisateur actuel à partir de son nom d'utilisateur JWT.
   *
   * @param username - Le nom d'utilisateur JWT
   * @returns L'utilisateur trouvé
   */
  async findCurrentUser(username: string): Promise<User> {
    const user = await this.repository.findCurrentUserFromJwtUsername(username);
    return user;
  }

  /**
   * Trouve l'utilisateur actuel à partir de l'ID de son UserJwt.
   *
   * @param id - L'ID du UserJwt
   * @returns L'utilisateur trouvé
   */
  async findCurrentUserById(id: number): Promise<User> {
    const user = await this.repository.findCurrentUserFromJwtId(id);
    return user;
  }

  /**
   * Crée un nouvel utilisateur avec ses informations JWT.
   * Cette méthode est utilisée par les administrateurs pour créer des utilisateurs.
   *
   * @param dto - Les données de création de l'utilisateur (incluant les infos JWT)
   * @returns L'utilisateur créé
   * @throws BadRequestException si les données JWT ne sont pas fournies
   */
  async create(dto: UserCreateForAdminDto): Promise<User> {
    // Create the jwt user
    const userJwtDto = dto.userJwt;
    if (!userJwtDto) throw new BadRequestException();
    const userJwt = await this.userJwtService.create(
      {
        ...userJwtDto,
        activated: true,
      },
      false,
    );

    // Delete the jwt dto info
    delete dto.userJwt;

    // Create the user
    const newUser = this.repository.create(dto);
    newUser.userJwt = await this.userJwtService.findById(userJwt.id);
    const newUserSaved = await this.repository.save(newUser);

    return newUserSaved;
  }

  /**
   * Crée un utilisateur à partir d'un événement AuthJwtUserCreatedEvent.
   * Utilisé lors de la création automatique d'utilisateurs depuis le module d'authentification JWT.
   *
   * @param event - L'événement contenant le UserJwt créé
   * @returns L'utilisateur créé
   */
  async createFromAuthJwt(event: AuthJwtUserCreatedEvent): Promise<User> {
    const newUser = this.repository.create({});
    newUser.userJwt = event.user;

    const newUserSaved = await this.repository.save(newUser);

    return newUserSaved;
  }

  /**
   * Met à jour un utilisateur avec les données fournies.
   *
   * @param dtoToBeUpdated - Les données de mise à jour de l'utilisateur
   * @returns L'utilisateur mis à jour ou undefined si l'utilisateur n'existe pas
   */
  async update(dtoToBeUpdated: UserUpdateDto): Promise<User | undefined> {
    const existingDto = await this.findOne(dtoToBeUpdated.id);

    if (!existingDto) return;

    const updatedDto = {
      ...existingDto,
      ...dtoToBeUpdated,
    };

    const savedDto = await this.repository.save(updatedDto);
    return new User({ ...savedDto });
  }

  /**
   * Met à jour un utilisateur avec les données fournies (version admin).
   * Protège le rôle admin : si un administrateur essaie de se retirer son propre rôle admin,
   * celui-ci est conservé pour éviter les erreurs.
   *
   * @param dtoToBeUpdated - Les données de mise à jour de l'utilisateur (peut inclure les rôles)
   * @returns L'utilisateur mis à jour ou undefined si l'utilisateur n'existe pas
   */
  async updateAdmin(
    dtoToBeUpdated: AdminUserUpdateDto,
  ): Promise<User | undefined> {
    const existingDto = await this.findOne(dtoToBeUpdated.id);

    if (!existingDto) return;

    const isAdminUser = existingDto.roles?.includes(UserRoleEnum.Admin);
    const newUserHaveNotAdminRole = !dtoToBeUpdated.roles?.includes(
      UserRoleEnum.Admin,
    );

    // keep admin role for an admin, in case of mistake
    if (isAdminUser && newUserHaveNotAdminRole)
      dtoToBeUpdated.roles?.unshift(UserRoleEnum.Admin);

    const updatedDto = {
      ...existingDto,
      ...dtoToBeUpdated,
    };

    const savedDto = await this.repository.save(updatedDto);
    return new User({ ...savedDto });
  }

  /**
   * Supprime un utilisateur de manière soft (suppression logique).
   * Avant la suppression, modifie le nom d'utilisateur JWT pour éviter les conflits
   * et effectue une soft deletion du UserJwt associé.
   *
   * @param id - L'ID de l'utilisateur à supprimer
   * @returns L'utilisateur supprimé ou undefined
   */
  override async delete(id: number): Promise<User | undefined> {
    const userToBeDeleted = await this.repository.findOneFromId(id, {
      relations: ['userJwt'],
    });
    if (userToBeDeleted && userToBeDeleted.userJwt) {
      // Modifie le nom d'utilisateur pour éviter les conflits lors de la suppression
      userToBeDeleted.userJwt.username = `softDeleted_${userToBeDeleted?.userJwt.id}_${userToBeDeleted?.userJwt.username}`;
      await this.userJwtService.save(userToBeDeleted.userJwt);
      await this.userJwtService.softRemove(userToBeDeleted.userJwt);
    }
    // Perform soft deletion on the user
    return await super.delete(id);
  }

  /**
   * Recherche et pagine les utilisateurs avec des options de filtrage avancées.
   * Permet de filtrer par rôles et de rechercher par nom d'utilisateur.
   *
   * @param paginationOptions - Les options de pagination (limit, offset, orderBy, etc.)
   * @param searchOptions - Options de recherche et filtrage :
   *   - includes: Relations supplémentaires à inclure
   *   - roles: Liste des rôles pour filtrer les utilisateurs
   *   - search: Chaîne de recherche pour filtrer par nom d'utilisateur (recherche LIKE insensible à la casse)
   * @returns Les résultats paginés avec les utilisateurs correspondant aux critères
   */
  async findAndPaginateWithOptions(
    paginationOptions: IPaginationOptions,
    searchOptions?: {
      includes?: string[];
      roles?: UserRoleEnum[];
      search?: string;
    },
  ) {
    let relations: string[] = paginationOptions.relations || [];
    if (searchOptions?.includes) {
      relations = [...relations, ...searchOptions.includes];
    }

    const conditions: IConditions[] = [];

    if (searchOptions) {
      // Filtre par rôles : si plusieurs rôles sont spécifiés, utilise OR (utilisateur avec l'un des rôles)
      if (searchOptions?.roles?.length) {
        const cond = {
          type: conditions.length > 0 ? TypeEnum.AND : undefined,
          conditions: searchOptions?.roles.map((role) => ({
            type: TypeEnum.OR,
            key: 'roles',
            operator: OperatorEnum.CONTAINS,
            value: role,
          })),
        };
        conditions.push(cond);
      }

      // Recherche par nom d'utilisateur (recherche LIKE insensible à la casse)
      if (searchOptions?.search && searchOptions.search !== '%') {
        if (!relations.includes('userJwt')) {
          relations.push('userJwt');
        }

        conditions.push({
          type: conditions.length > 0 ? TypeEnum.AND : undefined,
          key: 'userJwt.username',
          operator: OperatorEnum.LIKE,
          caseless: true,
          value: searchOptions.search,
        });
      }
    }

    return this.findAndPaginate({
      ...paginationOptions,
      conditions,
      relations,
    });
  }
}
