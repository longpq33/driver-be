import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from '@/auth/auth.service';
import { AuthController } from '@/auth/auth.controller';
import { OtpController } from '@/auth/otp.controller';
import { FirebaseService } from '@/auth/firebase.service';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { UsersModule } from '@/users/users.module';

const jwtFactory = {
  provide: 'JWT_SERVICE',
  useFactory: (configService: ConfigService) => {
    return new JwtService({
      secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
      signOptions: {
        expiresIn: '15m',
      },
    });
  },
  inject: [ConfigService],
};

const jwtRefreshFactory = {
  provide: 'JWT_REFRESH_SERVICE',
  useFactory: (configService: ConfigService) => {
    return new JwtService({
      secret:
        configService.get<string>('JWT_REFRESH_SECRET') ||
        'your-refresh-secret-key',
      signOptions: {
        expiresIn: '7d',
      },
    });
  },
  inject: [ConfigService],
};

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    FirebaseService,
    JwtStrategy,
    jwtFactory,
    jwtRefreshFactory,
  ],
  controllers: [AuthController, OtpController],
  exports: [AuthService, FirebaseService],
})
export class AuthModule {}
