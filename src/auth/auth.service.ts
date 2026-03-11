import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterDto } from 'src/users/dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    @Inject('JWT_REFRESH_SERVICE') private jwtRefreshService: JwtService,
    private jwtService: JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: Partial<User>; accessToken: string }> {
    const { phone, email, password, name, role } = registerDto;

    const existingPhone = await this.usersService.findByPhone(phone);
    if (existingPhone) {
      throw new ConflictException('Phone already registered');
    }

    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      phone,
      email,
      passwordHash,
      name,
      role: (role as UserRole) || UserRole.DRIVER,
      provider: 'local',
    });

    const payload = { sub: user.id, phone: user.phone, role: user.role };
    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: Partial<User>; accessToken: string; refreshToken: string }> {
    const { phone, password } = loginDto;

    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const refreshPayload = { sub: user.id, phone: user.phone, role: user.role, type: 'refresh' };
    
    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtRefreshService.sign(refreshPayload),
    };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtRefreshService.verify(refreshTokenDto.refreshToken);
      
      // Verify it's a refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const newPayload = { sub: user.id, phone: user.phone, role: user.role };
      const newRefreshPayload = { sub: user.id, phone: user.phone, role: user.role, type: 'refresh' };

      return {
        accessToken: this.jwtService.sign(newPayload),
        refreshToken: this.jwtRefreshService.sign(newRefreshPayload),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
