import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutPlansService } from './workout-plans.service';

describe('WorkoutPlansService', () => {
  let service: WorkoutPlansService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkoutPlansService],
    }).compile();

    service = module.get<WorkoutPlansService>(WorkoutPlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
