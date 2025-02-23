import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreatePointDto {
  @ApiProperty({ example: 'Random Region' })
  @IsString()
  @IsOptional()
  region: string;

  @ApiProperty({ example: 'Random Area' })
  @IsString()
  @IsOptional()
  area: string;

  @ApiProperty({ example: 'Random Territory' })
  @IsString()
  @IsOptional()
  territory: string;

  @ApiProperty({ example: 'Random DH' })
  @IsString()
  @IsOptional()
  dh: string;

  @ApiProperty({ example: 'Random Point' })
  @IsString()
  @IsOptional()
  point: string;
}
