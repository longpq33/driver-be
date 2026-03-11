import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phone: '0123456789',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    name: 'Test User',
    role: 'driver',
    provider: 'local',
    isActive: true,
  };

  beforeEach(async () => {
    usersService = {
      findByPhone: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      phone: '0123456789',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'driver',
    };

    it('should throw ConflictException if phone already exists', async () => {
      (usersService.findByPhone as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      (usersService.findByPhone as jest.Mock).mockResolvedValue(null);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create a new user successfully', async () => {
      (usersService.findByPhone as jest.Mock).mockResolvedValue(null);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should default role to driver if not provided', async () => {
      (usersService.findByPhone as jest.Mock).mockResolvedValue(null);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
      });

      const dtoWithoutRole = { ...registerDto };
      delete dtoWithoutRole.role;

      await service.register(dtoWithoutRole);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'driver',
        }),
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      phone: '0123456789',
      password: 'password123',
    };

    it('should throw UnauthorizedException if user not found', async () => {
      (usersService.findByPhone as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      (usersService.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      (usersService.findByPhone as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      (compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user and accessToken on successful login', async () => {
      (usersService.findByPhone as jest.Mock).mockResolvedValue(mockUser);
      (compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(jwtService.sign).toHaveBeenCalled();
    });
  });
});
