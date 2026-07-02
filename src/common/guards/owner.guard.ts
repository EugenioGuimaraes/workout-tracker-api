import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthUser {
  id: string;
}

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();
    const planId = req.params['id'] as string;
    const userId = req.user?.id;

    const plan = await this.prisma.workoutPlan.findUnique({
      where: { id: planId },
      select: { userId: true },
    });

    if (!plan) throw new NotFoundException('Workout plan not found');
    if (plan.userId !== userId) throw new ForbiddenException();

    return true;
  }
}
