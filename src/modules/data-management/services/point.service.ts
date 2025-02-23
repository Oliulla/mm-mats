import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Point } from '../schemas/point.schema';
import { Model } from 'mongoose';
import { CreatePointDto } from '../dtos/create-point.dto';

@Injectable()
export class PointsService {
  constructor(
    @InjectModel(Point.name) private readonly pointModel: Model<Point>,
  ) {}

  async createPoint(createPointDto: CreatePointDto) {
    const data = await this.pointModel.create(createPointDto);
    if (!data) throw new BadRequestException('An error occurred!');

    return {
      message: 'Request success',
      data,
    };
  }

  async getPoints() {
    const data = await this.pointModel.find();

    return {
      message: 'Request success',
      data,
    };
  }
}
