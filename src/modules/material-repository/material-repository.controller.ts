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
import { PointMaterialTransferDto } from './dtos/point-material-transfer.dto';
// import { MaterialIdQtyDto } from './dtos/action-for-material-activity.dto';

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

  @ApiParam({ name: 'userId', example: '67bacc1cdfff7fff55aafc8d' })
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
  @Patch('user-allocated-material/:userId/:pointId/:campaignId/:actionType')
  userMaterialActions(
    @Param('userId') userId: string,
    @Param('pointId') pointId: string,
    @Param('campaignId') campaignId: string,
    @Param('actionType') actionType: ActionType,
    @Body() data: UserMaterialConfirmRCancelPatchDto[],
  ) {
    if (!isValidObjectId(pointId) || !isValidObjectId(campaignId)) {
      throw new BadRequestException('Invalid point or campaign Id!');
    }

    return this.materialRepositoryService.userMaterialActions(
      userId,
      pointId,
      campaignId,
      actionType,
      data,
    );
  }

  // @ApiParam({ name: 'userId', example: '67bacc1cdfff7fff55aafc8d' })
  // @ApiParam({ name: 'pointId', example: '67bac016c7637581cd846145' })
  // @ApiParam({ name: 'campaignId', example: '67babd16358703a8bd184905' })
  // @ApiBody({
  //   type: UserMaterialConfirmRCancelPatchDto,
  //   isArray: true,
  // })
  // @Patch('user-material-return/:userId/:pointId/:campaignId')
  // userMaterialReturnPatch(
  //   @Param('userId') userId: string,
  //   @Param('pointId') pointId: string,
  //   @Param('campaignId') campaignId: string,
  //   @Body() data: MaterialIdQtyDto[],
  // ) {
  //   if (
  //     !isValidObjectId(userId) ||
  //     !isValidObjectId(pointId) ||
  //     !isValidObjectId(campaignId)
  //   ) {
  //     throw new BadRequestException('Invalid user, point or campaign Id!');
  //   }

  //   return this.materialRepositoryService.userMaterialReturnPatch(
  //     userId,
  //     pointId,
  //     campaignId,
  //     data,
  //   );
  // }

  @ApiParam({ name: 'srcPointId', example: '67bac016c7637581cd846145' })
  @ApiParam({ name: 'srcCampId', example: '67babd16358703a8bd184905' })
  @ApiParam({ name: 'destPointId', example: '67ce7260b7b9c14bdb5769b4' })
  @ApiParam({ name: 'destCampId', example: '67ce7300b7b9c14bdb5769b6' })
  @ApiBody({
    type: PointMaterialTransferDto,
    isArray: true,
  })
  @Patch(
    'point-material-transfer/:srcPointId/:srcCampId/:destPointId/:destCampId',
  )
  pointMaterialTransferPatch(
    @Param('srcPointId') srcPointId: string,
    @Param('srcCampId') srcCampId: string,
    @Param('destPointId') destPointId: string,
    @Param('destCampId') destCampId: string,
    @Body() data: PointMaterialTransferDto[],
  ) {
    if (
      !isValidObjectId(srcPointId) ||
      !isValidObjectId(srcCampId) ||
      !isValidObjectId(destPointId) ||
      !isValidObjectId(destCampId)
    ) {
      throw new BadRequestException('Invalid point or campaign Id!');
    }

    return this.materialRepositoryService.pointMaterialTransferPatch(
      srcPointId,
      srcCampId,
      destPointId,
      destCampId,
      data,
    );
  }
}
