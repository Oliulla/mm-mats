/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    if (!file?.buffer) {
      throw new BadRequestException('Invalid file uploaded');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch (err) {
      console.error(
        'Error reading Excel file:',
        err instanceof Error ? err.message : err,
      );
      throw new BadRequestException('Error reading Excel file');
    }

    if (!workbook?.SheetNames.length) {
      throw new BadRequestException('Invalid Excel file');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
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

    // Header row for materials
    const firstMatsDoc = jsonData[0];
    const campaignObjectId = new Types.ObjectId(campaignId);

    // Preprocess the Excel data
    const formattedData = jsonData
      .slice(1)
      .map(
        ({ Region, Area, Territory, Distribution, Point, ...materials }) => ({
          point: Point,
          material: Object.keys(materials).map((key) => {
            const rawName = firstMatsDoc[key];
            const name =
              typeof rawName === 'string' ? rawName : String(rawName || '');
            return {
              name,
              allocated: Number(materials[key]) || 0,
              remaining: 0,
              pending: Number(materials[key]) || 0,
            };
          }),
        }),
      );

    const [dbMaterials, dbPoints] = await Promise.all([
      this.materialModel.find().select('name _id'),
      this.pointModel.find().select('point _id'),
    ]);

    const materialMap: Map<string, Types.ObjectId> = new Map(
      dbMaterials.map((mat) => [mat.name, mat._id]),
    );
    const pointMap: Map<string, Types.ObjectId> = new Map(
      dbPoints.map((pt) => [pt.point, pt._id]),
    );

    const bulkOps = formattedData.flatMap(({ point, material }) => {
      const pointId = pointMap.get(point);
      if (!pointId) return [];

      const materialsMapped = material.flatMap(
        ({ name, allocated, remaining, pending }) => {
          if (typeof name !== 'string' || !name.trim()) return [];
          const materialId = materialMap.get(name);
          return materialId
            ? [{ id: materialId, allocated, remaining, pending }]
            : [];
        },
      );

      return materialsMapped.length > 0
        ? [
            {
              updateOne: {
                filter: { campaign: campaignObjectId, point: pointId },
                update: {
                  $set: {
                    campaign: campaignObjectId,
                    point: pointId,
                    material: materialsMapped,
                  },
                },
                upsert: true,
              },
            },
          ]
        : [];
    });

    if (bulkOps.length > 0) {
      await this.materialRepositoryModel.bulkWrite(bulkOps);
    }

    return { data: null, message: 'Request Success' };
  }
}
