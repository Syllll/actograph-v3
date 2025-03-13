import { UserJwtService } from '@auth-jwt/services/userJwt.service';
import { BaseService } from '@utils/services/base.service';
import { authJwtUserCreatedEvent } from '@auth-jwt/events/authJwtUserCreated.event';
import { UserCreateForAdminDto } from '../dtos/user-create-for-admin.dto';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { UserRoleEnum } from '@users/utils/user-role.enum';
import { UserUpdateDto } from '@users/dtos/user-patch.dto';
import { AdminUserUpdateDto } from '@users/dtos/admin/admin-user-patch.dto';
import { IPaginationOptions } from '@utils/repositories/base.repositories';
import { ResetPasswordToken } from './reset-password-token';
export declare class UserService extends BaseService<User, UserRepository> {
    private readonly repository;
    private readonly userJwtService;
    resetPasswordToken: ResetPasswordToken;
    constructor(repository: UserRepository, userJwtService: UserJwtService);
    findFromUserJwtId(id: number): Promise<User | null>;
    chooseNewPasswordAfterReset(userId: number, newPassword: string): Promise<User>;
    askForResetPassword(userId: number): Promise<{
        id: number;
        tempPassword: string;
    }>;
    getAll(): Promise<User[]>;
    findOne(id: number): Promise<User | undefined>;
    findWithUsername(username: string): Promise<Partial<User[]> | undefined>;
    findCurrentUser(username: string): Promise<User>;
    findCurrentUserById(id: number): Promise<User>;
    create(dto: UserCreateForAdminDto): Promise<User>;
    createFromAuthJwt(event: authJwtUserCreatedEvent): Promise<User>;
    update(dtoToBeUpdated: UserUpdateDto): Promise<User | undefined>;
    updateAdmin(dtoToBeUpdated: AdminUserUpdateDto): Promise<User | undefined>;
    delete(id: number): Promise<User | undefined>;
    findAndPaginateWithOptions(paginationOptions: IPaginationOptions, searchOptions?: {
        includes?: string[];
        roles?: UserRoleEnum[];
        search?: string;
    }): Promise<import("@utils/repositories/base.repositories").IPaginationOutput<User>>;
}
