import { IsString, IsOptional, IsEmail } from 'class-validator';

// Check if phone/email already exists
export class CheckExistenceDto {
  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
