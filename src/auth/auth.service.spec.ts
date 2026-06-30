import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('argon2');

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  passwordHash: '$argon2id$hashed',
  name: 'Test User',
  createdAt: new Date(),
};

const mockRefreshToken = {
  id: 'rt-uuid-1',
  tokenHash: 'sha256hash',
  userId: mockUser.id,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  revoked: false,
  createdAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: MockProxy<UsersService>;
  let jwtService: MockProxy<JwtService>;
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let configService: MockProxy<ConfigService>;

  beforeEach(async () => {
    usersService = mock<UsersService>();
    jwtService = mock<JwtService>();
    prisma = {
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    configService = mock<ConfigService>();
    configService.get.mockReturnValue('test-secret');

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── signup ───────────────────────────────────────────────────────────────

  describe('signup', () => {
    it('deve retornar access token e refresh token', async () => {
      usersService.create.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.signup({
        email: mockUser.email,
        name: mockUser.name,
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('deve lançar ConflictException se email já existir', async () => {
      usersService.create.mockRejectedValue(
        new ConflictException('Email already in use'),
      );

      await expect(
        service.signup({
          email: mockUser.email,
          name: mockUser.name,
          password: 'pw',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('deve retornar access token e refresh token com credenciais corretas', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.login({
        email: mockUser.email,
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('deve lançar UnauthorizedException com mensagem genérica se senha incorreta', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: mockUser.email, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({ email: mockUser.email, password: 'wrong' }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('deve lançar UnauthorizedException com a mesma mensagem genérica se email não existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@x.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({ email: 'nobody@x.com', password: 'pw' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  // ─── refresh ──────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('deve retornar novo par de tokens e revogar o token anterior', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.refreshToken.update.mockResolvedValue({
        ...mockRefreshToken,
        revoked: true,
      });
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      usersService.findById.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValueOnce('new-access-token');
      jwtService.signAsync.mockResolvedValueOnce('new-refresh-token');

      const result = await service.refresh(mockUser.id, 'raw-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revoked: true } }),
      );
    });

    it('deve revogar todos os tokens do usuário e lançar UnauthorizedException se token já revogado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        revoked: true,
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await expect(
        service.refresh(mockUser.id, 'raw-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: mockUser.id } }),
      );
    });

    it('deve lançar UnauthorizedException se token não encontrado no banco', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refresh(mockUser.id, 'raw-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se token expirado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.refresh(mockUser.id, 'raw-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deve revogar o refresh token atual', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(mockUser.id, 'raw-refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith<
        [
          {
            where: { userId: string; tokenHash: string };
            data: { revoked: boolean };
          },
        ]
      >({
        where: expect.objectContaining({ userId: mockUser.id }) as {
          userId: string;
          tokenHash: string;
        },
        data: { revoked: true },
      });
    });
  });

  describe('logoutAll', () => {
    it('deve revogar todos os refresh tokens do usuário', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await service.logoutAll(mockUser.id);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        data: { revoked: true },
      });
    });
  });
});
