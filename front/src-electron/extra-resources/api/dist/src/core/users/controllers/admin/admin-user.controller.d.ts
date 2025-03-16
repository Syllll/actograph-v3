import { UserCreateForAdminDto } from '@users/dtos/user-create-for-admin.dto';
import { BaseController } from '@utils/controllers/base.controller';
import { IPaginationOutput } from '@utils/repositories/base.repositories';
import { User } from '../../entities/user.entity';
import { UserService } from '../../services/user.service';
import { UserJwtService } from '@auth-jwt/services/userJwt.service';
import { AdminUserUpdateDto } from '../../dtos/admin/admin-user-patch.dto';
import { ISearchQueryParams } from '@utils/decorators';
export declare class AdminUserController extends BaseController {
  private readonly service;
  private readonly userJwtService;
  constructor(service: UserService, userJwtService: UserJwtService);
  getAll(): Promise<User[]>;
  getWithPagination(
    searchQueryParams: ISearchQueryParams,
    relations: string[] | undefined,
    searchString: string,
    filterRoles?: string[]
  ): Promise<IPaginationOutput<User>>;
  getOne(id: number): Promise<Partial<User>>;
  resetPassword(id: number): Promise<{
    id: number;
    tempPassword: string;
  }>;
  create(body: UserCreateForAdminDto): Promise<Partial<User>>;
  update(body: AdminUserUpdateDto): Promise<User>;
  remove(id: number): Promise<Partial<User> | undefined>;
}
