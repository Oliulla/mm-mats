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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaterialRepository.name, schema: MaterialRepositorySchema },
      {
        name: Material.name,
        schema: MaterialSchema,
      },
      {
        name: Point.name,
        schema: PointSchema,
      },
    ]),
  ],
  controllers: [MaterialRepositoryController],
  providers: [MaterialRepositoryService],
  exports: [MongooseModule, MaterialRepositoryService],
})
export class MaterialRepositoryModule {}
