import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PointsService } from './services/point.service';
import { CreatePointDto } from './dtos/create-point.dto';

@ApiTags('data-management')
@Controller('data-management')
export class DataManagementController {
  constructor(private readonly pointsService: PointsService) {}

  @Post('create-point')
  create(@Body() createPointDto: CreatePointDto) {
    return this.pointsService.create(createPointDto);
  }

  @Get('all-points')
  getById() {
    return this.pointsService.getAll();
  }
}
