import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

const mockUser = {
  id: 'uuid-1',
  email: 'test@example.com',
  passwordHash: '$argon2id$v=19$...',
  name: 'Test User',
  createdAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: MockProxy<UsersRepository>;

  beforeEach(async () => {
    repository = mock<UsersRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('deve criar usuário com senha hasheada (nunca armazenar senha pura)', async () => {
      const plainPassword = 'password123';
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: mockUser.email,
        name: mockUser.name,
        password: plainPassword,
      });

      expect(result).toEqual(mockUser);
      const arg = repository.create.mock.calls[0][0];
      expect(arg.passwordHash).not.toBe(plainPassword);
      expect(arg.passwordHash).toBeDefined();
      expect(arg.passwordHash.length).toBeGreaterThan(20);
    });

    it('deve lançar ConflictException se email já existir', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: mockUser.email,
          name: mockUser.name,
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('deve retornar null ao buscar usuário inexistente', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('deve retornar o usuário quando encontrado', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
    });
  });
});
