import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '@/users/users.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    // Config module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TypeORM configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'driver-dev'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Chỉ dùng true ở dev environment
        logging: configService.get<string>('APP_ENV') === 'development',
        extra: {
          pool: {
            min: 2,
            max: 10,
          },
        },
      }),
    }),
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
