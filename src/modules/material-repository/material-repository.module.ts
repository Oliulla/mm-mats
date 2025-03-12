import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MaterialRepository,
  MaterialRepositorySchema,
} from './schemas/material-repository.schema';
import { MaterialRepositoryController } from './material-repository.controller';
import { MaterialRepositoryService } from './material-repository.service';
import { Material, MaterialSchema } from '../material/schemas/material.schema';
import { Point, PointSchema } from '../data-management/schemas/point.schema';
import { Campaign, CampaignSchema } from '../campaign/schemas/campaign.schema';
import {
  PointMaterialRepository,
  PointMaterialRepositorySchema,
} from './schemas/point-material-repository.schema';
import { MaterialRepositoryKind } from './material-repository.entities';
import {
  UserMaterialRepository,
  UserMaterialRepositorySchema,
} from './schemas/user-material-repository.schema';
import {
  PointMaterialTransferRepository,
  PointMaterialTransferRepositorySchema,
} from './schemas/point-material-transfer-repository.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MaterialRepository.name,
        schema: MaterialRepositorySchema,
        discriminators: [
          {
            name: PointMaterialRepository.name,
            schema: PointMaterialRepositorySchema,
            value: MaterialRepositoryKind.POINT,
          },
          {
            name: UserMaterialRepository.name,
            schema: UserMaterialRepositorySchema,
            value: MaterialRepositoryKind.USER,
          },
          {
            name: PointMaterialTransferRepository.name,
            schema: PointMaterialTransferRepositorySchema,
            value: MaterialRepositoryKind.POINT,
          },
        ],
      },
      {
        name: Material.name,
        schema: MaterialSchema,
      },
      {
        name: Point.name,
        schema: PointSchema,
      },
      {
        name: Campaign.name,
        schema: CampaignSchema,
      },
    ]),
  ],
  controllers: [MaterialRepositoryController],
  providers: [MaterialRepositoryService],
  exports: [MongooseModule, MaterialRepositoryService],
})
export class MaterialRepositoryModule {}
