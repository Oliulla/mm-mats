import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber } from 'class-validator';
import * as mongoose from 'mongoose';

export class PointMaterialRejectDto {
  @ApiProperty({
    example: '67bacc1cdfff7fff55fffc8d',
    type: mongoose.Schema.Types.ObjectId,
  })
  @IsMongoId()
  @IsNotEmpty()
  materialId: mongoose.Schema.Types.ObjectId;

  @ApiProperty({
    example: 5,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
