import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CATEGORY, MATERIALFOR } from '../material.entities';
import { ImageDto } from 'src/utils/image.dto';

export class CreateMaterialDto {
  @ApiProperty({ example: 'Material-1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: MATERIALFOR.TOBACCO })
  @IsString()
  @IsOptional()
  @IsEnum(MATERIALFOR)
  for: MATERIALFOR;

  @ApiProperty({ required: true, example: CATEGORY.POSM })
  @IsString()
  @IsNotEmpty()
  @IsEnum(CATEGORY)
  category: CATEGORY;

  @ApiProperty({ example: 'BATB' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @Type(() => ImageDto)
  @ValidateNested()
  @IsOptional()
  @ApiPropertyOptional()
  image: ImageDto;
}
