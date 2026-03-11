import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber('VN')
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}
