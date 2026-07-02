import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkoutStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnerGuard } from '../common/guards/owner.guard';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { WorkoutPlansService } from './workout-plans.service';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

@ApiTags('workout-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workout-plans')
export class WorkoutPlansController {
  constructor(private readonly workoutPlansService: WorkoutPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um plano de treino com exercícios' })
  @ApiResponse({ status: 201, description: 'Plano criado' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkoutPlanDto) {
    return this.workoutPlansService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos os planos do usuário autenticado' })
  @ApiQuery({ name: 'status', enum: WorkoutStatus, required: false })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status', new ParseEnumPipe(WorkoutStatus, { optional: true }))
    status?: WorkoutStatus,
  ) {
    return this.workoutPlansService.findAll(user.id, status);
  }

  @Get(':id')
  @UseGuards(OwnerGuard)
  @ApiOperation({ summary: 'Retorna um plano de treino pelo ID' })
  @ApiResponse({ status: 200, description: 'Plano encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Plano não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutPlansService.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(OwnerGuard)
  @ApiOperation({ summary: 'Atualiza um plano de treino' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateWorkoutPlanDto,
  ) {
    return this.workoutPlansService.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(OwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um plano de treino' })
  @ApiResponse({ status: 204, description: 'Plano removido' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutPlansService.remove(id, user.id);
  }
}
