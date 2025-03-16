'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.UserService = void 0;
const common_1 = require('@nestjs/common');
const typeorm_1 = require('@nestjs/typeorm');
const userJwt_service_1 = require('../../../general/auth-jwt/services/userJwt.service');
const base_service_1 = require('../../../utils/services/base.service');
const user_entity_1 = require('../entities/user.entity');
const user_repository_1 = require('../repositories/user.repository');
const user_role_enum_1 = require('../utils/user-role.enum');
const base_repositories_1 = require('../../../utils/repositories/base.repositories');
const password_rules_1 = require('./password.rules');
const reset_password_token_1 = require('./reset-password-token');
let UserService = class UserService extends base_service_1.BaseService {
  constructor(repository, userJwtService) {
    super(repository);
    this.repository = repository;
    this.userJwtService = userJwtService;
    this.resetPasswordToken = new reset_password_token_1.ResetPasswordToken(
      this,
      repository,
      userJwtService
    );
  }
  async findFromUserJwtId(id) {
    return await this.repository.findOne({
      where: {
        userJwt: {
          id: id,
        },
      },
    });
  }
  async chooseNewPasswordAfterReset(userId, newPassword) {
    const user = await this.findOne(userId);
    if (!user) {
      throw new common_1.NotFoundException("L`utilisateur n'a pas été trouvé");
    }
    const userJwt = user.userJwt;
    if (!user.resetPasswordOngoing) {
      throw new common_1.InternalServerErrorException(
        'Un reset doit être en cours pour que cette opération fonctionne'
      );
    }
    await this.userJwtService.changePassword(userJwt.id, newPassword);
    await this.update({
      id: user.id,
      resetPasswordOngoing: false,
    });
    const newUser = await this.findOne(userId);
    if (!newUser) {
      throw new common_1.NotFoundException(
        "Le nouvel utilisateur n'a pas été trouvé"
      );
    }
    return newUser;
  }
  async askForResetPassword(userId) {
    const user = await this.findOne(userId);
    if (!user) {
      throw new common_1.NotFoundException("L`utilisateur n'a pas été trouvé");
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
      isValid = (0, password_rules_1.passwordCheckRules)(tempPassword) === true;
      count++;
    }
    if (!isValid) {
      throw new common_1.InternalServerErrorException(
        `Le mot de passe n'a pas pu être généré, veuillez essayer à nouveau.`
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
  async getAll() {
    const users = await this.repository.find({
      relations: ['userJwt'],
    });
    return users;
  }
  async findOne(id) {
    const user = await this.repository.findOneFromId(id, {
      relations: ['userJwt'],
    });
    return user;
  }
  async findWithUsername(username) {
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
  async findCurrentUser(username) {
    const user = await this.repository.findCurrentUserFromJwtUsername(username);
    return user;
  }
  async findCurrentUserById(id) {
    const user = await this.repository.findCurrentUserFromJwtId(id);
    return user;
  }
  async create(dto) {
    const userJwtDto = dto.userJwt;
    if (!userJwtDto) throw new common_1.BadRequestException();
    const userJwt = await this.userJwtService.create(
      Object.assign(Object.assign({}, userJwtDto), { activated: true }),
      false
    );
    delete dto.userJwt;
    const newUser = this.repository.create(dto);
    newUser.userJwt = await this.userJwtService.findById(userJwt.id);
    const newUserSaved = await this.repository.save(newUser);
    return newUserSaved;
  }
  async createFromAuthJwt(event) {
    const newUser = this.repository.create({});
    newUser.userJwt = event.user;
    const newUserSaved = await this.repository.save(newUser);
    return newUserSaved;
  }
  async update(dtoToBeUpdated) {
    const existingDto = await this.findOne(dtoToBeUpdated.id);
    if (!existingDto) return;
    const updatedDto = Object.assign(
      Object.assign({}, existingDto),
      dtoToBeUpdated
    );
    const savedDto = await this.repository.save(updatedDto);
    return new user_entity_1.User(Object.assign({}, savedDto));
  }
  async updateAdmin(dtoToBeUpdated) {
    var _a, _b, _c;
    const existingDto = await this.findOne(dtoToBeUpdated.id);
    if (!existingDto) return;
    const isAdminUser =
      (_a = existingDto.roles) === null || _a === void 0
        ? void 0
        : _a.includes(user_role_enum_1.UserRoleEnum.Admin);
    const newUserHaveNotAdminRole = !((_b = dtoToBeUpdated.roles) === null ||
    _b === void 0
      ? void 0
      : _b.includes(user_role_enum_1.UserRoleEnum.Admin));
    if (isAdminUser && newUserHaveNotAdminRole)
      (_c = dtoToBeUpdated.roles) === null || _c === void 0
        ? void 0
        : _c.unshift(user_role_enum_1.UserRoleEnum.Admin);
    const updatedDto = Object.assign(
      Object.assign({}, existingDto),
      dtoToBeUpdated
    );
    const savedDto = await this.repository.save(updatedDto);
    return new user_entity_1.User(Object.assign({}, savedDto));
  }
  async delete(id) {
    const userToBeDeleted = await this.repository.findOneFromId(id, {
      relations: ['userJwt'],
    });
    if (userToBeDeleted && userToBeDeleted.userJwt) {
      userToBeDeleted.userJwt.username = `softDeleted_${
        userToBeDeleted === null || userToBeDeleted === void 0
          ? void 0
          : userToBeDeleted.userJwt.id
      }_${
        userToBeDeleted === null || userToBeDeleted === void 0
          ? void 0
          : userToBeDeleted.userJwt.username
      }`;
      await this.userJwtService.save(userToBeDeleted.userJwt);
      await this.userJwtService.softRemove(userToBeDeleted.userJwt);
    }
    return await super.delete(id);
  }
  async findAndPaginateWithOptions(paginationOptions, searchOptions) {
    var _a;
    let relations = paginationOptions.relations || [];
    if (
      searchOptions === null || searchOptions === void 0
        ? void 0
        : searchOptions.includes
    ) {
      relations = [...relations, ...searchOptions.includes];
    }
    const conditions = [];
    if (searchOptions) {
      if (
        (_a =
          searchOptions === null || searchOptions === void 0
            ? void 0
            : searchOptions.roles) === null || _a === void 0
          ? void 0
          : _a.length
      ) {
        const cond = {
          type:
            conditions.length > 0
              ? base_repositories_1.TypeEnum.AND
              : undefined,
          conditions:
            searchOptions === null || searchOptions === void 0
              ? void 0
              : searchOptions.roles.map((role) => ({
                  type: base_repositories_1.TypeEnum.OR,
                  key: 'roles',
                  operator: base_repositories_1.OperatorEnum.CONTAINS,
                  value: role,
                })),
        };
        conditions.push(cond);
      }
      if (
        (searchOptions === null || searchOptions === void 0
          ? void 0
          : searchOptions.search) &&
        searchOptions.search !== '%'
      ) {
        if (!relations.includes('userJwt')) {
          relations.push('userJwt');
        }
        conditions.push({
          type:
            conditions.length > 0
              ? base_repositories_1.TypeEnum.AND
              : undefined,
          key: 'userJwt.username',
          operator: base_repositories_1.OperatorEnum.LIKE,
          caseless: true,
          value: searchOptions.search,
        });
      }
    }
    return this.findAndPaginate(
      Object.assign(Object.assign({}, paginationOptions), {
        conditions,
        relations,
      })
    );
  }
};
UserService = __decorate(
  [
    (0, common_1.Injectable)(),
    __param(
      0,
      (0, typeorm_1.InjectRepository)(user_repository_1.UserRepository)
    ),
    __metadata('design:paramtypes', [
      user_repository_1.UserRepository,
      userJwt_service_1.UserJwtService,
    ]),
  ],
  UserService
);
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map
