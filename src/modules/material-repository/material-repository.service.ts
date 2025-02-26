/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { MaterialRepository } from './schemas/material-repository.schema';
import { Material } from '../material/schemas/material.schema';
import { Point } from '../data-management/schemas/point.schema';
import { Campaign } from '../campaign/schemas/campaign.schema';
import {
  ExcelPointNdMats,
  Filter,
  FormattedPointNdMats,
  MaterialAfterProcess,
  MaterialBeforProcess,
} from './material-repository.entities';

@Injectable()
export class MaterialRepositoryService {
  constructor(
    @InjectModel(MaterialRepository.name)
    private readonly materialRepositoryModel: Model<MaterialRepository>,

    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,

    @InjectModel(Point.name)
    private readonly pointModel: Model<Point>,

    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<Campaign>,
  ) {}

  async materialAllocationAtPoint(
    campaignId: string,
    file: Express.Multer.File,
  ) {
    const workbook = this.readExcelFile(file);
    const jsonData = this.parseSheetData(workbook);
    const formattedData = this.formatExcelData(jsonData);

    const mappings = await this.fetchDatabaseMappings(campaignId);
    const materialMap = mappings[0] as Map<string, Types.ObjectId>;
    const pointMap = mappings[1] as Map<string, Types.ObjectId>;
    const campaignOid = mappings[2] as Types.ObjectId;

    await this.performBulkWriteOperations(
      formattedData,
      materialMap,
      pointMap,
      campaignOid,
    );
    return { data: null, message: 'Request Success' };
  }

  private readExcelFile(file: Express.Multer.File): XLSX.WorkBook {
    try {
      return XLSX.read(file.buffer, { type: 'buffer' });
    } catch (err) {
      throw new BadRequestException('Error reading Excel file');
    }
  }

  private parseSheetData(workbook: XLSX.WorkBook): any[] {
    if (!workbook?.SheetNames.length) {
      throw new BadRequestException('Invalid Excel file');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new BadRequestException('Sheet data is missing');
    }

    const jsonData = XLSX.utils.sheet_to_json(sheet);
    if (jsonData.length < 2) {
      throw new BadRequestException('Invalid data format in Excel');
    }

    return jsonData;
  }

  private formatExcelData(jsonData: any[]): any[] {
    const firstMatsDoc = jsonData[0];

    jsonData
      .slice(1)
      .map(({ Region, Area, Territory, Distribution, Point, ...materials }) =>
        console.log(materials, 'mats'),
      );

    return jsonData.slice(1).map(
      ({
        Region,
        Area,
        Territory,
        Distribution,
        Point,
        ...materials
      }: ExcelPointNdMats): FormattedPointNdMats => ({
        point: Point,
        material: Object.keys(materials).map((key) => ({
          name: String(firstMatsDoc[key] || ''),
          allocated: Number(materials[key]) || 0,
          remaining: 0,
          pending: Number(materials[key]) || 0,
        })),
      }),
    );
  }

  private async fetchDatabaseMappings(campaignId: string) {
    const [dbMaterials, dbPoints, campaign] = await Promise.all([
      this.materialModel.find().select('name _id'),
      this.pointModel.find().select('point _id'),
      this.campaignModel.findOne({ _id: campaignId }).select('_id'),
    ]);

    return [
      new Map(dbMaterials.map((mat) => [mat.name, mat._id])),
      new Map(dbPoints.map((pt) => [pt.point, pt._id])),
      campaign?._id,
    ];
  }

  private async performBulkWriteOperations(
    formattedData: any[],
    materialMap: Map<string, Types.ObjectId>,
    pointMap: Map<string, Types.ObjectId>,
    campaignOid: Types.ObjectId,
  ) {
    const bulkOps = await Promise.all(
      formattedData.map(async ({ point, material }: FormattedPointNdMats) => {
        const pointId = pointMap.get(point);
        if (!pointId) return null;

        const filter: Filter = { campaign: campaignOid, point: pointId };
        let matsDB: MaterialAfterProcess[] = await this.repositMats(filter);
        const matsInput = this.processInputMats(material, materialMap);

        matsDB = this.updateMaterials(matsDB, matsInput);

        return matsInput.length > 0
          ? {
              updateOne: {
                filter,
                update: {
                  $set: {
                    campaign: campaignOid,
                    point: pointId,
                    material: matsDB,
                  },
                },
                upsert: true,
              },
            }
          : null;
      }),
    );

    const validOps = bulkOps.filter((op) => op !== null);

    if (validOps.length > 0) {
      await this.materialRepositoryModel.bulkWrite(validOps);
    }
  }

  private async repositMats(filter: Filter) {
    const materialsRepo = await this.materialRepositoryModel
      .findOne(filter)
      .select('material');
    return (materialsRepo?.material as unknown as MaterialAfterProcess[]) || [];
  }

  private processInputMats(
    material: MaterialBeforProcess[],
    materialMap: Map<string, Types.ObjectId>,
  ) {
    return material.flatMap(({ name, allocated, remaining, pending }) => {
      const materialId: Types.ObjectId | undefined = materialMap.get(name);
      return materialId
        ? [{ id: materialId, allocated, remaining, pending }]
        : [];
    });
  }

  private updateMaterials(
    matsDB: MaterialAfterProcess[],
    matsInput: MaterialAfterProcess[],
  ): MaterialAfterProcess[] {
    matsInput.forEach((inputItem) => {
      const existingItem = matsDB.find(
        (dbItem) => dbItem.id.toString() === inputItem.id.toString(),
      );

      if (existingItem) {
        existingItem.allocated += inputItem.allocated;
        existingItem.pending += inputItem.pending;
      } else {
        matsDB.push(inputItem);
      }
    });

    return matsDB;
  }
}
