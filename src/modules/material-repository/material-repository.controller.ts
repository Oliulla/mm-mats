import {
  Controller,
  Param,
  UploadedFile,
  UseInterceptors,
  Patch,
  BadRequestException,
  Body,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialRepositoryService } from './material-repository.service';
import { ApiBody, ApiConsumes, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateFileUploadDto } from './dtos/create-file-upload.dto';
import { isValidObjectId } from 'mongoose';
import { PointMaterialAcceptDto } from './dtos/point-material-accept.dto';
import { UserMaterialAssignDto } from './dtos/user-material-assign.dto';
import { UserMaterialConfirmRCancelPatchDto } from './dtos/user-material-confirm.dto';
import { ActionType } from './material-repository.entities';

@ApiTags('material-repository')
@Controller('material-repository')
export class MaterialRepositoryController {
  constructor(
    private readonly materialRepositoryService: MaterialRepositoryService,
  ) {}

  @ApiParam({ name: 'campaignId', example: '67babd16358703a8bd184905' })
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

  @ApiParam({ name: 'pointId', example: '67bac016c7637581cd846145' })
  @ApiParam({ name: 'campaignId', example: '67babd16358703a8bd184905' })
  @Get('point-material-accept/:pointId/:campaignId')
  pointMaterialAcceptGet(
    @Param('pointId') pointId: string,
    @Param('campaignId') campaignId: string,
  ) {
    if (!isValidObjectId(pointId) || !isValidObjectId(campaignId)) {
      throw new BadRequestException('Invalid pointId or campaignId!');
    }

    return this.materialRepositoryService.pointMaterialAcceptGet(
      pointId,
      campaignId,
    );
  }

  @ApiParam({ name: 'pointId', example: '67bac016c7637581cd846145' })
  @ApiParam({ name: 'campaignId', example: '67babd16358703a8bd184905' })
  @ApiBody({
    type: [PointMaterialAcceptDto],
  })
  @Patch('point-material-accept/:pointId/:campaignId')
  pointMaterialAcceptPatch(
    @Param('pointId') pointId: string,
    @Param('campaignId') campaignId: string,
    @Body() data: PointMaterialAcceptDto[],
  ) {
    if (!isValidObjectId(pointId) || !isValidObjectId(campaignId)) {
      throw new BadRequestException('Invalid pointId or campaignId!');
    }

    return this.materialRepositoryService.pointMaterialAcceptPatch(
      pointId,
      campaignId,
      data,
    );
  }

  @ApiParam({ name: 'pointId', example: '67bac016c7637581cd846145' })
  @ApiParam({ name: 'campaignId', example: '67babd16358703a8bd184905' })
  @ApiBody({
    type: [UserMaterialAssignDto],
  })
  @Patch('user-material-assign/:pointId/:campaignId')
  userMaterialAssignPatch(
    @Param('pointId') pointId: string,
    @Param('campaignId') campaignId: string,
    @Body() data: UserMaterialAssignDto[],
  ) {
    if (!isValidObjectId(pointId) || !isValidObjectId(campaignId)) {
      throw new BadRequestException('Invalid pointId or campaignId!');
    }

    return this.materialRepositoryService.userMaterialAssignPatch(
      pointId,
      campaignId,
      data,
    );
  }

  @ApiParam({ name: 'pointId', example: '67bac016c7637581cd846145' })
  @ApiParam({ name: 'campaignId', example: '67babd16358703a8bd184905' })
  @ApiParam({
    name: 'actionType',
    example: ActionType.ACCEPT,
    enum: ActionType,
  })
  @ApiBody({
    type: UserMaterialConfirmRCancelPatchDto,
    isArray: true,
  })
  @Patch('user-allocated-material/:pointId/:campaignId/:actionType')
  userAllocatedMaterialConfirmRCancelPatch(
    @Param('pointId') pointId: string,
    @Param('campaignId') campaignId: string,
    @Param('actionType') actionType: ActionType,
    @Body() data: UserMaterialConfirmRCancelPatchDto[],
  ) {
    if (!isValidObjectId(pointId) || !isValidObjectId(campaignId)) {
      throw new BadRequestException('Invalid point or campaign Id!');
    }

    return this.materialRepositoryService.userAllocatedMaterialConfirmRCancelPatch(
      pointId,
      campaignId,
      actionType,
      data,
    );
  }
}
