import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OwnerGuard } from '../common/guards/owner.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkoutPlansController } from './workout-plans.controller';
import { WorkoutPlansService } from './workout-plans.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WorkoutPlansController],
  providers: [WorkoutPlansService, OwnerGuard],
})
export class WorkoutPlansModule {}
