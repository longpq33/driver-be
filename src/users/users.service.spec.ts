import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import {
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: Partial<Repository<User>>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phone: '0123456789',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    name: 'Test User',
    role: UserRole.DRIVER,
    provider: 'local',
    isActive: true,
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should return null if user not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('should return a user by phone', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByPhone(mockUser.phone);

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { phone: mockUser.phone },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        phone: '0123456789',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        name: 'Test User',
        role: UserRole.DRIVER,
        provider: 'local',
      };

      (repository.create as jest.Mock).mockReturnValue(userData);
      (repository.save as jest.Mock).mockResolvedValue({
        ...userData,
        id: 'new-id',
      });

      const result = await service.create(userData);

      expect(result).toHaveProperty('id');
      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateData = { name: 'Updated Name' };
      // Since updateData doesn't have email, findByEmail is skipped
      // findById is called after update to return updated user
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...updateData,
      });
      (repository.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.update(mockUser.id, updateData);

      expect(result).toEqual({ ...mockUser, ...updateData });
      expect(repository.update).toHaveBeenCalledWith(mockUser.id, updateData);
    });

    it('should throw ConflictException if email is already in use', async () => {
      const otherUser = { ...mockUser, id: 'different-id' };
      const updateData = { email: 'other@example.com' };

      (repository.findOne as jest.Mock)
        .mockResolvedValueOnce(otherUser)
        .mockResolvedValueOnce(mockUser);

      await expect(service.update(mockUser.id, updateData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      (repository.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.update('non-existent-id', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const currentPassword = 'oldPassword';
      const newPassword = 'newPassword';
      const newHash = 'newHashedPassword';

      (repository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (compare as jest.Mock).mockResolvedValue(true);
      (hash as jest.Mock).mockResolvedValue(newHash);
      (repository.update as jest.Mock).mockResolvedValue({ affected: 1 });

      await service.changePassword(mockUser.id, currentPassword, newPassword);

      expect(repository.update).toHaveBeenCalledWith(mockUser.id, {
        passwordHash: newHash,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword('non-existent', 'old', 'new'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(mockUser.id, 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
