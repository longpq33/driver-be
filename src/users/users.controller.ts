import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { UpdateUserDto } from '@/users/dto/update-user.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.userId);
    return { success: true, data: user };
  }

  @Put('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(req.user.userId, dto);
    return { success: true, data: user };
  }
}
