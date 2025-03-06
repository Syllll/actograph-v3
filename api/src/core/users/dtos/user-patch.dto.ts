import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UserUpdateCurrentDto {
  @IsOptional()
  @IsString()
  firstname?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsBoolean()
  preferDarkTheme?: boolean;

  @IsOptional()
  @IsBoolean()
  resetPasswordOngoing?: boolean;
}

export class UserUpdateDto extends UserUpdateCurrentDto {
  @IsNotEmpty()
  @IsNumber()
  id!: number;
}
