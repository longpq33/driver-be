import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import {
  LoginWithFirebaseDto,
  RegisterWithFirebaseDto,
} from '@/auth/dto/otp.dto';

@Controller('auth')
export class OtpController {
  constructor(private authService: AuthService) {}

  /**
   * Login with Firebase Auth
   * POST /api/auth/login-with-firebase
   */
  @Post('login-with-firebase')
  @HttpCode(HttpStatus.OK)
  async loginWithFirebase(@Body() loginWithFirebaseDto: LoginWithFirebaseDto) {
    const { phone, firebaseToken } = loginWithFirebaseDto;

    // Verify Firebase token and login
    const result = await this.authService.loginWithFirebase(
      phone,
      firebaseToken,
    );

    return {
      success: true,
      message: 'Login successful',
      data: result,
    };
  }

  /**
   * Register with Firebase Auth
   * POST /api/auth/register-with-firebase
   */
  @Post('register-with-firebase')
  async registerWithFirebase(
    @Body() registerWithFirebaseDto: RegisterWithFirebaseDto,
  ) {
    const { phone, firebaseToken, name, email } = registerWithFirebaseDto;

    // Verify Firebase token and register
    const result = await this.authService.registerWithFirebase({
      phone,
      firebaseToken,
      name,
      email,
    });

    return {
      success: true,
      message: 'Registration successful',
      data: result,
    };
  }
}
