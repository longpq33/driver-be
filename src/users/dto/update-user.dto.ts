import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsUrl()
  @IsOptional()
  avatar?: string;
}
