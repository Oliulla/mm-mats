import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material } from './schemas/material.schema';
import { CreateMaterialDto } from './dtos/create-material.dto';

@Injectable()
export class MaterialService {
  constructor(
    @InjectModel(Material.name) private readonly materialModel: Model<Material>,
  ) {}

  async create(createMaterialDto: CreateMaterialDto) {
    const data = await this.materialModel.create(createMaterialDto);
    if (!data) throw new BadRequestException('An error occurred!');

    return {
      message: 'Request success',
      data,
    };
  }

  async getAll() {
    const data = await this.materialModel.find();

    return {
      message: 'Request success',
      data,
    };
  }
}
