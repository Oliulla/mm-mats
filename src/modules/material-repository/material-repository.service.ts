/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types, UpdateOneModel } from 'mongoose';
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

    if (jsonData.length < 2) {
      throw new BadRequestException('Invalid data format in Excel');
    }

    const firstMatsDoc = jsonData[0];

    const data = jsonData.slice(1).map((entry) => {
      const { Region, Area, Territory, Distribution, Point, ...materials } =
        entry;

      const materialArray = Object.keys(materials).map((key) => ({
        name: firstMatsDoc[key],
        allocated: materials[key],
        remaining: 0,
        pending: materials[key],
      }));

      return {
        point: Point,
        material: materialArray,
      };
    });

    const dbMaterials = await this.materialModel.find().select('name');
    const points = await this.pointModel.find().select('point');

    const bulkOps: Array<{
      updateOne: {
        filter: { campaign: Types.ObjectId; point: Types.ObjectId };
        update: {
          $set: {
            campaign: Types.ObjectId;
            point: Types.ObjectId;
            material: any[];
          };
        };
        upsert: boolean;
      };
    }> = [];

    points.forEach((pt) => {
      const inputData = data.find((dt) => dt.point === pt.point);
      if (!inputData) return;

      const materialsMapped = inputData.material
        .map((inputMat) => {
          const materialDoc = dbMaterials.find(
            (dbMat) => dbMat.name === inputMat.name,
          );
          return materialDoc
            ? {
                id: materialDoc._id,
                allocated: Number(inputMat.allocated),
                remaining: Number(inputMat.remaining),
                pending: Number(inputMat.pending),
              }
            : null;
        })
        .filter(Boolean);

      bulkOps.push({
        updateOne: {
          filter: { campaign: new Types.ObjectId(campaignId), point: pt._id },
          update: {
            $set: {
              campaign: new Types.ObjectId(campaignId),
              point: pt._id,
              material: materialsMapped,
            },
          },
          upsert: true,
        },
      });
    });

    // console.log(JSON.stringify(bulkOps, null, 4));

    if (bulkOps.length > 0) {
      await this.materialRepositoryModel.bulkWrite(bulkOps);
    }

    return {
      data: null,
      message: 'Request Success',
    };
  }
}
