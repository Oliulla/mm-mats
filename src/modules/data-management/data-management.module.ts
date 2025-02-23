import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Point, PointSchema } from './schemas/point.schema';
import { DataManagementController } from './data-management.controller';
import { PointsService } from './services/point.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Point.name, schema: PointSchema }]),
  ],
  controllers: [DataManagementController],
  providers: [PointsService],
  exports: [MongooseModule, PointsService],
})
export class DataManagementModule {}
