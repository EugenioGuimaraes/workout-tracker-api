import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { WorkoutStatus } from '@prisma/client';
import { CreateWorkoutPlanDto } from './create-workout-plan.dto';

export class UpdateWorkoutPlanDto extends PartialType(CreateWorkoutPlanDto) {
  @ApiPropertyOptional({ enum: WorkoutStatus })
  @IsOptional()
  @IsEnum(WorkoutStatus)
  status?: WorkoutStatus;
}
