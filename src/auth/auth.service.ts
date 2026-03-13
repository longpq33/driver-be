import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/users/users.service';
import { User, UserRole } from '@/users/entities/user.entity';
import { RefreshTokenDto } from '@/auth/dto/refresh-token.dto';
import { FirebaseService } from '@/auth/firebase.service';

interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  type?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private firebaseService: FirebaseService,
    @Inject('JWT_SERVICE') private jwtService: JwtService,
    @Inject('JWT_REFRESH_SERVICE') private jwtRefreshService: JwtService,
  ) {}

  /**
   * Login with Firebase Auth - verify Firebase token then login
   */
  async loginWithFirebase(
    phone: string,
    firebaseToken: string,
  ): Promise<{
    user: Partial<User>;
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify Firebase token
    try {
      await this.firebaseService.verifyIdToken(firebaseToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    // Find user by phone
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new NotFoundException('User not found. Please register first.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const refreshPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      type: 'refresh',
    };

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

  /**
   * Register with Firebase Auth - verify Firebase token then register
   */
  async registerWithFirebase(registerData: {
    phone: string;
    name: string;
    email?: string;
    firebaseToken: string;
  }): Promise<{
    user: Partial<User>;
    accessToken: string;
    refreshToken: string;
  }> {
    const { phone, name, email, firebaseToken } = registerData;

    // Check if phone already exists
    const existingPhone = await this.usersService.findByPhone(phone);
    if (existingPhone) {
      throw new ConflictException('Phone already registered');
    }

    // If email provided, check if already exists
    if (email) {
      const existingEmail = await this.usersService.findByEmail(email);
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    // Verify Firebase token last
    try {
      await this.firebaseService.verifyIdToken(firebaseToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    // Create user with Firebase provider
    const user = await this.usersService.create({
      phone,
      email: email || undefined,
      name,
      role: UserRole.DRIVER,
      provider: 'firebase',
    });

    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const refreshPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      type: 'refresh',
    };

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

  /**
   * Find user by phone
   */
  findUserByPhone(phone: string): Promise<User | null> {
    return this.usersService.findByPhone(phone);
  }

  /**
   * Check if phone or email already exists
   */
  async checkExistence(phone?: string, email?: string): Promise<{
    phoneExists: boolean;
    emailExists: boolean;
  }> {
    let phoneExists = false;
    let emailExists = false;

    if (phone) {
      const user = await this.usersService.findByPhone(phone);
      phoneExists = !!user;
    }

    if (email) {
      const user = await this.usersService.findByEmail(email);
      emailExists = !!user;
    }

    return { phoneExists, emailExists };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtRefreshService.verify<JwtPayload>(
        refreshTokenDto.refreshToken,
      );

      // Verify it's a refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const newPayload = { sub: user.id, phone: user.phone, role: user.role };
      const newRefreshPayload = {
        sub: user.id,
        phone: user.phone,
        role: user.role,
        type: 'refresh',
      };

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
