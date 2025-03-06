import { IsEnum, IsOptional } from 'class-validator';

import { UserRoleEnum } from '../../utils/user-role.enum';
import { UserUpdateDto } from '../user-patch.dto';

export class AdminUserUpdateDto extends UserUpdateDto {
  @IsOptional()
  @IsEnum(UserRoleEnum, { each: true })
  roles?: UserRoleEnum[];
}
