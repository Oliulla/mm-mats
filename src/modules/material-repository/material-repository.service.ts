/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as XLSX from 'xlsx';
import { MaterialRepository } from './schemas/material-repository.schema';
import { Material } from '../material/schemas/material.schema';
import { Point } from '../data-management/schemas/point.schema';

@Injectable()
export class MaterialRepositoryService {
  constructor(
    @InjectModel(MaterialRepository.name)
    private readonly materialRepositoryModel: Model<MaterialRepository>,

    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,

    @InjectModel(Point.name)
    private readonly pointModel: Model<Point>,
  ) {}

  async materialAllocationAtPoint(
    campaignId: string,
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Invalid file uploaded');
    }

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch (err: unknown) {
      console.error(
        'Error reading Excel file:',
        err instanceof Error ? err.message : err,
      );
      throw new BadRequestException('Error reading Excel file');
    }

    if (!workbook || !workbook.SheetNames.length) {
      throw new BadRequestException('Invalid Excel file');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new BadRequestException('Sheet data is missing');
    }

    interface ParsedRow {
      Point: string;
      [key: string]: any;
    }
    const jsonData: ParsedRow[] = XLSX.utils.sheet_to_json<ParsedRow>(sheet);

    const firstInputDoc = jsonData[0];

    const data = jsonData.slice(1).map((entry) => {
      const { Region, Area, Territory, Distribution, Point, ...materials } =
        entry;

      const materialArray = Object.keys(materials).map((key) => ({
        name: firstInputDoc[key],
        allocated: materials[key],
        remaining: 0,
        pending: materials[key],
      }));

      return {
        point: Point,
        material: materialArray,
      };
    });

    const materials = await this.materialModel.find().select('name');
    const points = await this.pointModel.find().select('point');

    console.log(materials, 'mats');

    console.log(points, 'points');

    const filteredMaterial = [];

    return {
      data: data,
      message: 'Material allocation updated successfully',
    };
  }
}
