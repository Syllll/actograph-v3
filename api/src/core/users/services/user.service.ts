import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { UserJwtService } from '@auth-jwt/services/userJwt.service';
import { BaseService } from '@utils/services/base.service';
import { authJwtUserCreatedEvent } from '@auth-jwt/events/authJwtUserCreated.event';
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

@Injectable()
export class UserService extends BaseService<User, UserRepository> {
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

  async findFromUserJwtId(id: number): Promise<User | null> {
    return await this.repository.findOne({
      where: {
        userJwt: {
          id: id,
        },
      },
    });
  }

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

  async askForResetPassword(userId: number): Promise<{
    id: number;
    tempPassword: string;
  }> {
    const user = await this.findOne(userId);
    if (!user) {
      throw new NotFoundException("L`utilisateur n'a pas été trouvé");
    }

    const userJwt = user.userJwt;

    function generateP() {
      let pass = '';
      const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + '0123456789@#$*µ!:;,/§?{}=@&';

      for (let i = 1; i <= 8; i++) {
        const char = Math.floor(Math.random() * str.length + 1);

        pass += str.charAt(char);
      }

      return pass;
    }

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

  async getAll(): Promise<User[]> {
    const users = await this.repository.find({
      relations: ['userJwt'],
    });

    return users;
  }

  override async findOne(id: number): Promise<User | undefined> {
    const user = await this.repository.findOneFromId(id, {
      relations: ['userJwt'],
    });

    return user;
  }

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

  async findCurrentUser(username: string): Promise<User> {
    const user = await this.repository.findCurrentUserFromJwtUsername(username);
    return user;
  }

  async findCurrentUserById(id: number): Promise<User> {
    const user = await this.repository.findCurrentUserFromJwtId(id);
    return user;
  }

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

  async createFromAuthJwt(event: authJwtUserCreatedEvent): Promise<User> {
    const newUser = this.repository.create({});
    newUser.userJwt = event.user;

    const newUserSaved = await this.repository.save(newUser);

    return newUserSaved;
  }

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

  override async delete(id: number): Promise<User | undefined> {
    const userToBeDeleted = await this.repository.findOneFromId(id, {
      relations: ['userJwt'],
    });
    if (userToBeDeleted && userToBeDeleted.userJwt) {
      userToBeDeleted.userJwt.username = `softDeleted_${userToBeDeleted?.userJwt.id}_${userToBeDeleted?.userJwt.username}`;
      await this.userJwtService.save(userToBeDeleted.userJwt);
      await this.userJwtService.softRemove(userToBeDeleted.userJwt);
    }
    // Perform soft deletion on the user
    return await super.delete(id);
  }

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
