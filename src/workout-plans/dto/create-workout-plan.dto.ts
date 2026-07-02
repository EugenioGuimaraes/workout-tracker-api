import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateWorkoutExerciseDto {
  @ApiProperty({ example: 'uuid-of-exercise' })
  @IsUUID()
  exerciseId: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  sets: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  reps: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order: number;
}

export class CreateWorkoutPlanDto {
  @ApiProperty({ example: 'Upper body strength A' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Focus on progressive overload' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ example: '2026-07-05T10:00:00Z' })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiProperty({ type: [CreateWorkoutExerciseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises: CreateWorkoutExerciseDto[];
}
