import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MaterialRepository,
  MaterialRepositorySchema,
} from './schemas/material-repository.schema';
import { MaterialRepositoryController } from './material-repository.controller';
import { MaterialRepositoryService } from './material-repository.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaterialRepository.name, schema: MaterialRepositorySchema },
    ]),
  ],
  controllers: [MaterialRepositoryController],
  providers: [MaterialRepositoryService],
  exports: [MongooseModule, MaterialRepositoryService],
})
export class MaterialRepositoryModule {}
