import {
  Controller,
  Param,
  UploadedFile,
  UseInterceptors,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialRepositoryService } from './material-repository.service';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CreateFileUploadDto } from './dtos/create-file-upload.dto';
import { isValidObjectId } from 'mongoose';

@ApiTags('material-repository')
@Controller('material-repository')
export class MaterialRepositoryController {
  constructor(
    private readonly materialRepositoryService: MaterialRepositoryService,
  ) {}

  @ApiBody({
    type: CreateFileUploadDto,
  })
  @ApiConsumes('multipart/form-data')
  @Patch('material-allocate-at-point/:campaignId')
  @UseInterceptors(FileInterceptor('file'))
  materialAllocationAtPoint(
    @Param('campaignId') campaignId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!isValidObjectId(campaignId)) {
      throw new BadRequestException('Invalid campaignId!');
    }

    if (!file?.buffer) {
      throw new BadRequestException('Invalid file uploaded!');
    }

    return this.materialRepositoryService.materialAllocationAtPoint(
      campaignId,
      file,
    );
  }
}
