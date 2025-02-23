import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Material, MaterialSchema } from './schemas/material.schema';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
    ]),
  ],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MongooseModule, MaterialService],
})
export class MaterialModule {}
