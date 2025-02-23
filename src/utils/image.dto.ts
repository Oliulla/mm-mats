import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ImageDto {
  @ApiProperty({ example: 'name' })
  @IsString()
  name: string;

  @ApiProperty({
    example:
      'https://img.freepik.com/free-photo/new-product-business-launch-word_53876-132169.jpg',
  })
  @IsString()
  thumb: string;

  @ApiProperty({
    example:
      'https://img.freepik.com/free-photo/new-product-business-launch-word_53876-132169.jpg',
  })
  @IsString()
  original: string;
}
