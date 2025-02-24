import { ApiProperty } from '@nestjs/swagger';

export class CreateFileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
