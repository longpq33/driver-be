import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

// Firebase Auth DTOs
export class LoginWithFirebaseDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  firebaseToken: string;
}

export class RegisterWithFirebaseDto extends LoginWithFirebaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;
}
