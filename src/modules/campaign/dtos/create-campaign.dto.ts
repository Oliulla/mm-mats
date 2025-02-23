import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CampaignType } from '../campaign.entities';

export class CreateCampaignDto {
  @ApiProperty({
    example: 'Spring Campaign 2025',
    description: 'Name of the campaign',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: CampaignType.TOBACCO,
    enum: CampaignType,
    description: 'Kind of the campaign',
  })
  @IsEnum(CampaignType)
  kind: CampaignType;

  @ApiProperty({
    example: '2025-02-23T12:33:31.948Z',
    description: 'Start date of the campaign',
  })
  @IsDate()
  startAt: Date;

  @ApiProperty({
    example: '2025-05-23T12:33:31.948Z',
    description: 'End date of the campaign',
  })
  @IsDate()
  endAt: Date;

  @ApiProperty({
    example: 'This is the Spring campaign for the retail chain.',
    description: 'Description of the campaign',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
