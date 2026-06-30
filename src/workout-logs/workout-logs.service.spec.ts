import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutLogsService } from './workout-logs.service';

describe('WorkoutLogsService', () => {
  let service: WorkoutLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkoutLogsService],
    }).compile();

    service = module.get<WorkoutLogsService>(WorkoutLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
