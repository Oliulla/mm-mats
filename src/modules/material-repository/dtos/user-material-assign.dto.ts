import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import * as mongoose from 'mongoose';

class MaterialDto {
  @ApiProperty({
    required: true,
    example: '66f5714bc9486111ceb02b4a',
    type: mongoose.Schema.Types.ObjectId,
  })
  @IsMongoId()
  id: mongoose.Schema.Types.ObjectId;

  @ApiProperty({ required: true, example: 1 })
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class UserMaterialAssignDto {
  @ApiProperty({
    example: '67bacc1cdfff7fff55fffc8d',
    type: mongoose.Schema.Types.ObjectId,
  })
  @IsMongoId()
  @IsNotEmpty()
  userId: mongoose.Schema.Types.ObjectId;

  @ApiProperty({
    example: [
      { id: '67bacc1cdfff7fff55fffc8d', quantity: 5 },
      { id: '67beadd2c53d0856df216c47', quantity: 5 },
    ],
    type: [MaterialDto],
  })
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => MaterialDto)
  material: MaterialDto[];

  //   @ApiProperty({
  //     example: ['307B', '307A'],
  //   })
  //   @IsString({ each: true })
  //   @IsArray()
  //   route: string[];
}
