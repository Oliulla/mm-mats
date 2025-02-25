import {
  Controller,
  Param,
  UploadedFile,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialRepositoryService } from './material-repository.service';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CreateFileUploadDto } from './dtos/create-file-upload.dto';

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
    return this.materialRepositoryService.materialAllocationAtPoint(
      campaignId,
      file,
    );
  }
}
