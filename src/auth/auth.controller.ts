import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { RefreshTokenDto } from '@/auth/dto/refresh-token.dto';
import { CheckExistenceDto } from '@/auth/dto/check-existence.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Check if phone or email already exists
   * POST /api/auth/check-existence
   */
  @Post('check-existence')
  @HttpCode(HttpStatus.OK)
  async checkExistence(@Body() checkExistenceDto: CheckExistenceDto) {
    const { phone, email } = checkExistenceDto;
    const result = await this.authService.checkExistence(phone, email);
    return {
      success: true,
      message: 'Check completed',
      data: result,
    };
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto);
    return {
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    };
  }
}
