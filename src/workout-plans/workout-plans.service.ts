import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkoutStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';

const PLAN_INCLUDE = {
  exercises: {
    include: { exercise: true },
    orderBy: { order: 'asc' as const },
  },
} as const;

@Injectable()
export class WorkoutPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorkoutPlanDto) {
    await this.assertExercisesExist(dto.exercises.map((e) => e.exerciseId));

    return this.prisma.workoutPlan.create({
      data: {
        userId,
        name: dto.name,
        comments: dto.comments,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        exercises: {
          create: dto.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets,
            reps: e.reps,
            weightKg: e.weightKg,
            order: e.order,
          })),
        },
      },
      include: PLAN_INCLUDE,
    });
  }

  async findAll(userId: string, status?: WorkoutStatus) {
    return this.prisma.workoutPlan.findMany({
      where: { userId, ...(status ? { status } : {}) },
      include: PLAN_INCLUDE,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id },
      include: PLAN_INCLUDE,
    });

    if (!plan) throw new NotFoundException('Workout plan not found');
    if (plan.userId !== userId) throw new ForbiddenException();

    return plan;
  }

  async update(id: string, userId: string, dto: UpdateWorkoutPlanDto) {
    await this.findOne(id, userId);

    return this.prisma.workoutPlan.update({
      where: { id },
      data: {
        name: dto.name,
        comments: dto.comments,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.status,
      },
      include: PLAN_INCLUDE,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.workoutPlan.delete({ where: { id } });
  }

  private async assertExercisesExist(exerciseIds: string[]) {
    if (exerciseIds.length === 0) return;

    const found = await this.prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((e) => e.id));
    const missing = [...new Set(exerciseIds)].filter(
      (id) => !foundIds.has(id),
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        `Exercise(s) not found: ${missing.join(', ')}`,
      );
    }
  }
}
