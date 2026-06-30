import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token recebido no login/signup' })
  @IsString()
  refreshToken: string;
}
