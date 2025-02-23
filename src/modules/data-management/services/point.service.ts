import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Point } from '../schemas/point.schema';
import { Model } from 'mongoose';

@Injectable()
export class PointsService {
  constructor(
    @InjectModel(Point.name) private readonly pointModel: Model<Point>,
  ) {}
}
