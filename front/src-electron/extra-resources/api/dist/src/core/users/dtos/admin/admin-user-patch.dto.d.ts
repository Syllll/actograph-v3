import { UserRoleEnum } from '../../utils/user-role.enum';
import { UserUpdateDto } from '../user-patch.dto';
export declare class AdminUserUpdateDto extends UserUpdateDto {
    roles?: UserRoleEnum[];
}
