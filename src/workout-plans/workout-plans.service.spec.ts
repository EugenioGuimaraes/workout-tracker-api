import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { WorkoutPlansService } from './workout-plans.service';

const USER_ID = 'user-uuid-1';
const OTHER_USER_ID = 'user-uuid-2';
const PLAN_ID = 'plan-uuid-1';

const mockExercise = {
  id: 'exercise-uuid-1',
  exerciseId: 'exercise-uuid-1',
  workoutPlanId: PLAN_ID,
  sets: 3,
  reps: 10,
  weightKg: 60,
  order: 0,
};

const mockPlan = {
  id: PLAN_ID,
  userId: USER_ID,
  name: 'Upper Body A',
  comments: null,
  scheduledAt: null,
  status: WorkoutStatus.PENDING,
  exercises: [mockExercise],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WorkoutPlansService', () => {
  let service: WorkoutPlansService;
  let prisma: {
    workoutPlan: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    exercise: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      workoutPlan: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      exercise: {
        findMany: jest.fn().mockResolvedValue([{ id: 'exercise-uuid-1' }]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutPlansService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WorkoutPlansService>(WorkoutPlansService);
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('deve criar plano de treino com exercícios para o usuário autenticado', async () => {
      prisma.workoutPlan.create.mockResolvedValue(mockPlan);

      const dto: CreateWorkoutPlanDto = {
        name: 'Upper Body A',
        exercises: [
          { exerciseId: 'exercise-uuid-1', sets: 3, reps: 10, order: 0 },
        ],
      };

      const result = await service.create(USER_ID, dto);

      expect(result).toEqual(mockPlan);
      expect(prisma.workoutPlan.create).toHaveBeenCalledWith<
        [{ data: { userId: string } }]
      >(
        expect.objectContaining({
          data: expect.objectContaining({ userId: USER_ID }) as {
            userId: string;
          },
        }) as { data: { userId: string } },
      );
    });

    it('deve lançar BadRequestException quando algum exercício não existe', async () => {
      prisma.exercise.findMany.mockResolvedValue([]);

      const dto: CreateWorkoutPlanDto = {
        name: 'Upper Body A',
        exercises: [
          { exerciseId: 'nonexistent-exercise', sets: 3, reps: 10, order: 0 },
        ],
      };

      await expect(service.create(USER_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.workoutPlan.create).not.toHaveBeenCalled();
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('deve retornar apenas os planos do usuário autenticado', async () => {
      prisma.workoutPlan.findMany.mockResolvedValue([mockPlan]);

      const result = await service.findAll(USER_ID);

      expect(result).toEqual([mockPlan]);
      expect(prisma.workoutPlan.findMany).toHaveBeenCalledWith<
        [{ where: { userId: string } }]
      >(
        expect.objectContaining({
          where: expect.objectContaining({ userId: USER_ID }) as {
            userId: string;
          },
        }) as { where: { userId: string } },
      );
    });

    it('deve filtrar por status quando fornecido', async () => {
      prisma.workoutPlan.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, WorkoutStatus.COMPLETED);

      expect(prisma.workoutPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, status: WorkoutStatus.COMPLETED },
        }),
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('deve retornar o plano quando o usuário é o dono', async () => {
      prisma.workoutPlan.findUnique.mockResolvedValue(mockPlan);

      const result = await service.findOne(PLAN_ID, USER_ID);

      expect(result).toEqual(mockPlan);
    });

    it('deve lançar NotFoundException quando o plano não existe', async () => {
      prisma.workoutPlan.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException quando o usuário não é o dono', async () => {
      prisma.workoutPlan.findUnique.mockResolvedValue(mockPlan);

      await expect(service.findOne(PLAN_ID, OTHER_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('deve atualizar o plano quando o usuário é o dono', async () => {
      prisma.workoutPlan.findUnique.mockResolvedValue(mockPlan);
      const updatedPlan = { ...mockPlan, name: 'Updated Name' };
      prisma.workoutPlan.update.mockResolvedValue(updatedPlan);

      const dto: UpdateWorkoutPlanDto = { name: 'Updated Name' };
      const result = await service.update(PLAN_ID, USER_ID, dto);

      expect(result.name).toBe('Updated Name');
    });

    it('deve lançar ForbiddenException quando o usuário não é o dono', async () => {
      prisma.workoutPlan.findUnique.mockResolvedValue(mockPlan);

      await expect(
        service.update(PLAN_ID, OTHER_USER_ID, { name: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deve remover o plano quando o usuário é o dono', async () => {
      prisma.workoutPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.workoutPlan.delete.mockResolvedValue(mockPlan);

      await expect(service.remove(PLAN_ID, USER_ID)).resolves.not.toThrow();
      expect(prisma.workoutPlan.delete).toHaveBeenCalledWith({
        where: { id: PLAN_ID },
      });
    });

    it('deve lançar ForbiddenException quando o usuário não é o dono', async () => {
      prisma.workoutPlan.findUnique.mockResolvedValue(mockPlan);

      await expect(service.remove(PLAN_ID, OTHER_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
