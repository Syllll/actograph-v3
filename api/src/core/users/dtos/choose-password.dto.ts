import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChoosePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
